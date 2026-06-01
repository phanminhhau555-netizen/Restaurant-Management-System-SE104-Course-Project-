const ACTIVE_ORDER_STATUSES = ['dang_goi', 'cho_thanh_toan'];

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const floorQuantity = (value) => Math.max(0, Math.floor(Number(value) || 0));

function getReservedUsageSql(excludeOrderId) {
  const excludeClause = excludeOrderId ? 'AND o.id <> ?' : '';

  return `
    SELECT r2.ingredient_id, SUM(r2.amount * oi.quantity) AS reserved_quantity
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN recipes r2 ON r2.menu_item_id = oi.menu_item_id
    WHERE o.status IN (?, ?)
      AND oi.status != "huy"
      ${excludeClause}
    GROUP BY r2.ingredient_id
  `;
}

function getReservationParams(excludeOrderId) {
  const params = [...ACTIVE_ORDER_STATUSES];
  if (excludeOrderId) params.push(excludeOrderId);
  return params;
}

async function getMenuItemAvailability(db, menuItemId, options = {}) {
  const excludeOrderId = options.excludeOrderId ? Number(options.excludeOrderId) : null;
  const reservedUsageSql = getReservedUsageSql(excludeOrderId);
  const reservationParams = getReservationParams(excludeOrderId);

  const [rows] = await db.query(
    `
      SELECT
        r.ingredient_id,
        r.amount,
        i.name AS ingredient_name,
        i.unit,
        i.quantity AS stock_quantity,
        COALESCE(reserved.reserved_quantity, 0) AS reserved_quantity
      FROM recipes r
      JOIN ingredients i ON i.id = r.ingredient_id
      LEFT JOIN (${reservedUsageSql}) reserved ON reserved.ingredient_id = r.ingredient_id
      WHERE r.menu_item_id = ?
    `,
    [...reservationParams, menuItemId]
  );

  if (rows.length === 0) {
    return {
      menu_item_id: Number(menuItemId),
      has_recipe: false,
      max_quantity: null,
      limiting_ingredients: [],
    };
  }

  let maxQuantity = Number.POSITIVE_INFINITY;
  const ingredients = rows.map((row) => {
    const amount = toPositiveNumber(row.amount);
    const remaining = toPositiveNumber(row.stock_quantity) - toPositiveNumber(row.reserved_quantity);
    const availableQuantity = amount > 0 ? floorQuantity(remaining / amount) : Number.POSITIVE_INFINITY;

    maxQuantity = Math.min(maxQuantity, availableQuantity);

    return {
      ingredient_id: row.ingredient_id,
      ingredient_name: row.ingredient_name,
      unit: row.unit,
      required_per_item: amount,
      stock_quantity: Number(row.stock_quantity || 0),
      reserved_quantity: Number(row.reserved_quantity || 0),
      remaining_quantity: Math.max(0, remaining),
      available_item_quantity: Number.isFinite(availableQuantity) ? availableQuantity : null,
    };
  });

  const normalizedMax = Number.isFinite(maxQuantity) ? floorQuantity(maxQuantity) : null;

  return {
    menu_item_id: Number(menuItemId),
    has_recipe: true,
    max_quantity: normalizedMax,
    limiting_ingredients: ingredients.filter(
      (ingredient) => ingredient.available_item_quantity === normalizedMax
    ),
    ingredients,
  };
}

async function getMenuItemsAvailabilityMap(db, options = {}) {
  const excludeOrderId = options.excludeOrderId ? Number(options.excludeOrderId) : null;
  const reservedUsageSql = getReservedUsageSql(excludeOrderId);
  const reservationParams = getReservationParams(excludeOrderId);

  const [rows] = await db.query(
    `
      SELECT
        r.menu_item_id,
        r.ingredient_id,
        r.amount,
        i.name AS ingredient_name,
        i.unit,
        i.quantity AS stock_quantity,
        COALESCE(reserved.reserved_quantity, 0) AS reserved_quantity
      FROM recipes r
      JOIN ingredients i ON i.id = r.ingredient_id
      LEFT JOIN (${reservedUsageSql}) reserved ON reserved.ingredient_id = r.ingredient_id
      WHERE r.amount > 0
    `,
    reservationParams
  );

  return rows.reduce((map, row) => {
    const menuItemId = Number(row.menu_item_id);
    const amount = toPositiveNumber(row.amount);
    const remaining = toPositiveNumber(row.stock_quantity) - toPositiveNumber(row.reserved_quantity);
    const availableQuantity = amount > 0 ? floorQuantity(remaining / amount) : null;
    const current = map.get(menuItemId) || {
      max_quantity: Number.POSITIVE_INFINITY,
      ingredients: [],
    };

    if (availableQuantity !== null) {
      current.max_quantity = Math.min(current.max_quantity, availableQuantity);
    }

    current.ingredients.push({
      ingredient_id: row.ingredient_id,
      ingredient_name: row.ingredient_name,
      unit: row.unit,
      required_per_item: amount,
      stock_quantity: Number(row.stock_quantity || 0),
      reserved_quantity: Number(row.reserved_quantity || 0),
      remaining_quantity: Math.max(0, remaining),
      available_item_quantity: availableQuantity,
    });

    map.set(menuItemId, current);
    return map;
  }, new Map());
}

function normalizeAvailabilityMap(availabilityMap) {
  for (const [menuItemId, availability] of availabilityMap.entries()) {
    availabilityMap.set(menuItemId, {
      ...availability,
      max_quantity: Number.isFinite(availability.max_quantity)
        ? floorQuantity(availability.max_quantity)
        : null,
    });
  }

  return availabilityMap;
}

async function getNormalizedMenuItemsAvailabilityMap(db, options = {}) {
  const availabilityMap = await getMenuItemsAvailabilityMap(db, options);
  return normalizeAvailabilityMap(availabilityMap);
}

async function checkOrderItemsAvailability(db, items, options = {}) {
  const requestedByMenuItem = new Map();

  for (const item of items || []) {
    const menuItemId = Number(item.menu_item_id);
    const quantity = toPositiveNumber(item.quantity);
    if (!menuItemId || quantity <= 0) continue;
    requestedByMenuItem.set(menuItemId, (requestedByMenuItem.get(menuItemId) || 0) + quantity);
  }

  const shortages = [];
  for (const [menuItemId, requestedQuantity] of requestedByMenuItem.entries()) {
    const availability = await getMenuItemAvailability(db, menuItemId, options);
    if (availability.max_quantity !== null && requestedQuantity > availability.max_quantity) {
      shortages.push({
        menu_item_id: menuItemId,
        requested_quantity: requestedQuantity,
        max_quantity: availability.max_quantity,
        limiting_ingredients: availability.limiting_ingredients,
      });
    }
  }

  return shortages;
}

module.exports = {
  checkOrderItemsAvailability,
  getMenuItemAvailability,
  getMenuItemsAvailabilityMap: getNormalizedMenuItemsAvailabilityMap,
};
