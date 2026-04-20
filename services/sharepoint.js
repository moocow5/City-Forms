const { graphGet, graphPost, graphPatch } = require("./graph");

const SP_SITE_HOST = process.env.SP_SITE_HOST;
const SP_SITE_PATH = process.env.SP_SITE_PATH;
const SP_LIST_NAME = process.env.SP_LIST_NAME;

// Fields we need from the SP list
const SP_FIELDS = [
  "Title", "ReasonForTravel", "Destination", "Department",
  "TravelStartDate", "TravelEndDate", "TravelDuration",
  "Airline", "EstimatedAirfare",
  "Hotel", "Hotel_x0020_Rate", "EstimatedHotelCost", "Hotel_x0020_Cost",
  "Mileage", "MileageRate", "Mileage_x0020_Cost",
  "Breakfast", "BreakfastRate", "Breakfast_x0020_Cost",
  "Lunch", "LunchRate", "Lunch_x0020_Cost",
  "Dinner", "DinnerRate", "Dinner_x0020_Cost",
  "Total_x0020_Requested_x0020_Amou", "AuthorLookupId",
  // Reconciliation actuals
  "ActualRegistration", "ActualTravel",
  "ActualLodgingNights", "ActualLodgingRate", "ActualLodgingTotal",
  "ActualMileage", "ActualMileageRate", "ActualMileageTotal",
  "ActualOther1Desc", "ActualOther1Total", "ActualOther2Desc", "ActualOther2Total",
  "ActualTotalExpense", "ActualAmountPaid", "ActualAdvanceMoney", "ActualAmountDue",
  "ReconciliationDeptHead", "ReconciliationDate",
].join(",");

/**
 * Resolve the SharePoint site ID
 */
async function getSiteId(token) {
  const site = await graphGet(token, `/sites/${SP_SITE_HOST}:${SP_SITE_PATH}`);
  return site.id;
}

/**
 * Find the list ID by display name
 */
async function getListId(token, siteId) {
  const lists = await graphGet(
    token,
    `/sites/${siteId}/lists?$filter=displayName eq '${SP_LIST_NAME}'`
  );
  if (!lists.value || lists.value.length === 0) {
    throw new Error(`List "${SP_LIST_NAME}" not found on site.`);
  }
  return lists.value[0].id;
}

/**
 * Load all travel expense request items
 */
async function getItems(token, siteId, listId) {
  const data = await graphGet(
    token,
    `/sites/${siteId}/lists/${listId}/items?$expand=fields($select=${SP_FIELDS})&$top=500`
  );
  const items = (data.value || []).map((i) => ({
    id: String(i.id),
    fields: i.fields,
  }));

  // Resolve requester names from User Information List
  const userIds = [...new Set(items.map((i) => i.fields.AuthorLookupId).filter(Boolean))];

  const userMap = {};
  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const u = await graphGet(
          token,
          `/sites/${siteId}/lists('User Information List')/items/${uid}?$select=fields&$expand=fields($select=Title)`
        );
        userMap[uid] = u.fields.Title || `User ${uid}`;
      } catch {
        userMap[uid] = `User ${uid}`;
      }
    })
  );

  items.forEach((item) => {
    item.requesterName = userMap[item.fields.AuthorLookupId] || "";
  });

  return items;
}

/**
 * Get a single item by ID
 */
async function getItem(token, siteId, listId, itemId) {
  const data = await graphGet(
    token,
    `/sites/${siteId}/lists/${listId}/items/${itemId}?$expand=fields($select=${SP_FIELDS})`
  );
  const item = { id: String(data.id), fields: data.fields };

  // Resolve requester
  if (item.fields.AuthorLookupId) {
    try {
      const u = await graphGet(
        token,
        `/sites/${siteId}/lists('User Information List')/items/${item.fields.AuthorLookupId}?$select=fields&$expand=fields($select=Title)`
      );
      item.requesterName = u.fields.Title || "";
    } catch {
      item.requesterName = "";
    }
  }
  return item;
}

// ── Field parsers (same logic as original, server-side) ──

function parseLocation(val) {
  if (!val) return "";
  try {
    const loc = typeof val === "string" ? JSON.parse(val) : val;
    // Handle both PascalCase and camelCase property names
    const name = loc.DisplayName || loc.displayName || "";
    const addrObj = loc.Address || loc.address;
    const addr =
      loc.FormattedAddress || loc.formattedAddress ||
      (addrObj
        ? [addrObj.Street || addrObj.street, addrObj.City || addrObj.city, addrObj.State || addrObj.state, addrObj.PostalCode || addrObj.postalCode]
            .filter(Boolean)
            .join(", ")
        : "");
    return name && addr ? `${name}, ${addr}` : name || addr || "";
  } catch {
    return String(val);
  }
}

function parseCalc(val) {
  if (val == null) return "";
  const n = parseFloat(val);
  return isNaN(n) || n === 0 ? "" : n.toFixed(2);
}

function parseDate(val) {
  if (!val) return "";
  try {
    return new Date(val).toLocaleDateString("en-US");
  } catch {
    return String(val);
  }
}

function parseNum(val) {
  if (val == null) return "";
  const n = parseFloat(val);
  return isNaN(n) || n === 0 ? "" : String(n);
}

function parseMoney(val) {
  if (val == null) return "";
  const n = parseFloat(val);
  return isNaN(n) || n === 0 ? "" : n.toFixed(2);
}

/**
 * Map a raw SP item into flat form-field values
 */
function mapItemToForm(item) {
  const f = item.fields;
  return {
    department: f.Department || "",
    employeeName: item.requesterName || "",
    purpose: f.Title || "",
    purpose2: f.ReasonForTravel || "",
    location: parseLocation(f.Destination),
    fromDate: parseDate(f.TravelStartDate),
    toDate: parseDate(f.TravelEndDate),
    travelCheck: parseMoney(f.EstimatedAirfare),
    other1Desc: f.Airline ? `Airfare: ${f.Airline}` : "",
    lodgingNights: parseNum(f.Hotel_x0020_Rate),
    lodgingRate: parseMoney(f.EstimatedHotelCost),
    lodgingTotal: parseCalc(f.Hotel_x0020_Cost),
    mileageMiles: f.Mileage || "",
    mileageRate: parseMoney(f.MileageRate),
    mileageTotal: parseCalc(f.Mileage_x0020_Cost),
    breakfastIS: parseNum(f.Breakfast),
    breakfastISRate: parseMoney(f.BreakfastRate),
    breakfastTotal: parseCalc(f.Breakfast_x0020_Cost),
    lunchIS: parseNum(f.Lunch),
    lunchISRate: parseMoney(f.LunchRate),
    lunchTotal: parseCalc(f.Lunch_x0020_Cost),
    supperIS: parseNum(f.Dinner),
    supperISRate: parseMoney(f.DinnerRate),
    supperTotal: parseCalc(f.Dinner_x0020_Cost),
    totalPrepaid: parseCalc(f.Total_x0020_Requested_x0020_Amou),
    // Reconciliation actuals (populated if a reconciliation has been saved)
    reg2:           parseMoney(f.ActualRegistration),
    travel2:        parseMoney(f.ActualTravel),
    lodgingNights2: parseNum(f.ActualLodgingNights),
    lodgingRate2:   parseMoney(f.ActualLodgingRate),
    lodgingTotal2:  parseMoney(f.ActualLodgingTotal),
    mileageMiles2:  parseNum(f.ActualMileage),
    mileageRate2:   parseMoney(f.ActualMileageRate),
    mileageTotal2:  parseMoney(f.ActualMileageTotal),
    other1Desc2:    f.ActualOther1Desc  || "",
    other1Total2:   parseMoney(f.ActualOther1Total),
    other2Desc2:    f.ActualOther2Desc  || "",
    other2Total2:   parseMoney(f.ActualOther2Total),
    totalExpense:   parseMoney(f.ActualTotalExpense),
    amountPaid:     parseMoney(f.ActualAmountPaid),
    advanceMoney2:  parseMoney(f.ActualAdvanceMoney),
    amountDue:      parseMoney(f.ActualAmountDue),
    deptHead2:      f.ReconciliationDeptHead || "",
  };
}

/**
 * Map reconciliation form fields to SP column names for PATCH.
 */
function mapReconcileToFields(formData) {
  const n = (v) => (v === "" || v == null) ? null : parseFloat(v) || null;
  const s = (v) => v || null;
  return {
    ActualRegistration:    n(formData.reg2),
    ActualTravel:          n(formData.travel2),
    ActualLodgingNights:   n(formData.lodgingNights2),
    ActualLodgingRate:     n(formData.lodgingRate2),
    ActualLodgingTotal:    n(formData.lodgingTotal2),
    ActualMileage:         n(formData.mileageMiles2),
    ActualMileageRate:     n(formData.mileageRate2),
    ActualMileageTotal:    n(formData.mileageTotal2),
    ActualOther1Desc:      s(formData.other1Desc2),
    ActualOther1Total:     n(formData.other1Total2),
    ActualOther2Desc:      s(formData.other2Desc2),
    ActualOther2Total:     n(formData.other2Total2),
    ActualTotalExpense:    n(formData.totalExpense),
    ActualAmountPaid:      n(formData.amountPaid),
    ActualAdvanceMoney:    n(formData.advanceMoney2),
    ActualAmountDue:       n(formData.amountDue),
    ReconciliationDeptHead: s(formData.deptHead2),
    ReconciliationDate:    new Date().toISOString(),
  };
}

/**
 * Save reconciliation actuals to an existing SP list item.
 */
async function saveReconciliation(token, siteId, listId, itemId, formData) {
  const fields = mapReconcileToFields(formData);
  const body = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  await graphPatch(token, `/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, body);
}

/**
 * Map flat form-field values back to SharePoint list field names.
 * Only includes fields the SP list actually stores.
 */
function mapFormToFields(formData) {
  const n = (v) => (v === "" || v == null) ? null : parseFloat(v) || null;
  const s = (v) => v || null;

  // Omit SharePoint calculated/read-only fields: Hotel_x0020_Cost,
  // Mileage_x0020_Cost, Breakfast/Lunch/Dinner_x0020_Cost,
  // Total_x0020_Requested_x0020_Amou — SP computes these automatically.
  return {
    Title:            s(formData.purpose),
    ReasonForTravel:  s(formData.purpose2),
    Department:       s(formData.department),
    TravelStartDate:  s(formData.fromDate) ? new Date(formData.fromDate).toISOString() : null,
    TravelEndDate:    s(formData.toDate)   ? new Date(formData.toDate).toISOString()   : null,
    EstimatedAirfare: n(formData.travelCheck),
    Hotel_x0020_Rate: n(formData.lodgingNights),
    EstimatedHotelCost: n(formData.lodgingRate),
    Mileage:          s(formData.mileageMiles),
    MileageRate:      n(formData.mileageRate),
    Breakfast:        n(formData.breakfastIS),
    BreakfastRate:    n(formData.breakfastISRate),
    Lunch:            n(formData.lunchIS),
    LunchRate:        n(formData.lunchISRate),
    Dinner:           n(formData.supperIS),
    DinnerRate:       n(formData.supperISRate),
  };
}

/**
 * Create a new SharePoint list item from form data.
 * Returns the new item's id.
 */
async function createItem(token, siteId, listId, formData) {
  const fields = mapFormToFields(formData);
  // Remove null values — SP will use column defaults for omitted fields
  const body = { fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null)) };
  const result = await graphPost(token, `/sites/${siteId}/lists/${listId}/items`, body);
  return String(result.id);
}

/**
 * Update an existing SharePoint list item from form data.
 */
async function updateItem(token, siteId, listId, itemId, formData) {
  const fields = mapFormToFields(formData);
  const body = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  await graphPatch(token, `/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, body);
}

module.exports = {
  getSiteId,
  getListId,
  getItems,
  getItem,
  mapItemToForm,
  mapFormToFields,
  mapReconcileToFields,
  createItem,
  updateItem,
  saveReconciliation,
  parseLocation,
  parseCalc,
  parseDate,
  parseNum,
  parseMoney,
};
