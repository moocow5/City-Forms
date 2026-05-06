const { graphGet, graphPatch, graphPost } = require("./graph");

const SP_SITE_HOST = process.env.SP_SITE_HOST;
const SP_SITE_PATH = process.env.SP_SITE_PATH;
const SETTINGS_LIST_NAME = "Travel Settings";

const SETTINGS_FIELDS = ["MealBreakfastRate", "MealLunchRate", "MealSupperRate", "MileageRate"].join(",");

async function getSettingsListId(token, siteId) {
  const lists = await graphGet(token, `/sites/${siteId}/lists?$filter=displayName eq '${SETTINGS_LIST_NAME}'`);
  if (!lists.value || lists.value.length === 0) return null;
  return lists.value[0].id;
}

async function getSettings(token, siteId) {
  try {
    const listId = await getSettingsListId(token, siteId);
    if (!listId) return {};
    const data = await graphGet(token, `/sites/${siteId}/lists/${listId}/items?$expand=fields($select=${SETTINGS_FIELDS})&$top=1`);
    if (!data.value || data.value.length === 0) return {};
    const f = data.value[0].fields;
    return {
      mealBreakfastRate: f.MealBreakfastRate != null ? String(f.MealBreakfastRate) : "",
      mealLunchRate:     f.MealLunchRate     != null ? String(f.MealLunchRate)     : "",
      mealSupperRate:    f.MealSupperRate    != null ? String(f.MealSupperRate)    : "",
      mileageRate:       f.MileageRate       != null ? String(f.MileageRate)       : "",
      _listId:           listId,
      _itemId:           String(data.value[0].id),
    };
  } catch {
    return {};
  }
}

async function saveSettings(token, siteId, data) {
  const listId = await getSettingsListId(token, siteId);
  if (!listId) throw new Error("Travel Settings list not found");
  const n = (v) => {
    const f = parseFloat(v);
    return (!isNaN(f) && f >= 0 && f <= 999) ? f : null;
  };
  const fields = {
    MealBreakfastRate: n(data.mealBreakfastRate),
    MealLunchRate:     n(data.mealLunchRate),
    MealSupperRate:    n(data.mealSupperRate),
    MileageRate:       n(data.mileageRate),
  };
  const body = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));

  // Try to update existing item, or create new one
  const existing = await graphGet(token, `/sites/${siteId}/lists/${listId}/items?$top=1`);
  if (existing.value && existing.value.length > 0) {
    const itemId = existing.value[0].id;
    await graphPatch(token, `/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, body);
  } else {
    await graphPost(token, `/sites/${siteId}/lists/${listId}/items`, { fields: body });
  }
}

module.exports = { getSettings, saveSettings };
