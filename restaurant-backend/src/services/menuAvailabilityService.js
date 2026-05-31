async function hideMenuItemsWithOutOfStockIngredients(db, ingredientIds = []) {
  const ids = [...new Set(ingredientIds.map(Number).filter(Boolean))];
  const params = [];
  let ingredientFilter = '';

  if (ids.length > 0) {
    ingredientFilter = 'AND i.id IN (?)';
    params.push(ids);
  }

  const [result] = await db.query(
    `UPDATE menu_items m
     JOIN recipes r ON r.menu_item_id = m.id
     JOIN ingredients i ON i.id = r.ingredient_id
     SET m.is_visible = 0
     WHERE i.quantity < r.amount
       ${ingredientFilter}`,
    params
  );

  return result.affectedRows || 0;
}

async function showMenuItemsWithAvailableIngredients(db, ingredientIds = []) {
  const ids = [...new Set(ingredientIds.map(Number).filter(Boolean))];

  if (ids.length === 0) {
    return 0;
  }

  const [result] = await db.query(
    `UPDATE menu_items m
     JOIN recipes touched_recipe ON touched_recipe.menu_item_id = m.id
     SET m.is_visible = 1
     WHERE touched_recipe.ingredient_id IN (?)
       AND NOT EXISTS (
         SELECT 1
         FROM recipes r
         JOIN ingredients i ON i.id = r.ingredient_id
         WHERE r.menu_item_id = m.id
           AND i.quantity < r.amount
       )`,
    [ids]
  );

  return result.affectedRows || 0;
}

module.exports = {
  hideMenuItemsWithOutOfStockIngredients,
  showMenuItemsWithAvailableIngredients,
};
