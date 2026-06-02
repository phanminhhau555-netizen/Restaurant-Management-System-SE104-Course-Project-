UPDATE menu_items
SET price = COALESCE(ROUND(price), 0);

ALTER TABLE menu_items
  MODIFY price BIGINT NOT NULL DEFAULT 0;
