-- =====================================================
-- SAMPLE MENU + INVENTORY DATA
-- Run this after schema.sql and after selecting your DB:
-- USE your_database_name;
-- =====================================================

START TRANSACTION;

-- Categories
INSERT INTO categories (name)
SELECT name
FROM (
  SELECT 'Món chính' AS name UNION ALL
  SELECT 'Món phụ' UNION ALL
  SELECT 'Đồ uống' UNION ALL
  SELECT 'Tráng miệng'
) AS seed_categories
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.name = seed_categories.name
);

-- Ingredients
INSERT INTO ingredients (name, unit, quantity, min_quantity)
SELECT name, unit, quantity, min_quantity
FROM (
  SELECT 'Gạo tẻ' AS name, 'kg' AS unit, 80.00 AS quantity, 10.00 AS min_quantity UNION ALL
  SELECT 'Bún tươi', 'kg', 45.00, 8.00 UNION ALL
  SELECT 'Phở khô', 'kg', 35.00, 6.00 UNION ALL
  SELECT 'Mì trứng', 'kg', 30.00, 5.00 UNION ALL
  SELECT 'Thịt bò', 'kg', 38.00, 6.00 UNION ALL
  SELECT 'Thịt heo', 'kg', 42.00, 7.00 UNION ALL
  SELECT 'Thịt gà', 'kg', 40.00, 7.00 UNION ALL
  SELECT 'Sườn heo', 'kg', 28.00, 5.00 UNION ALL
  SELECT 'Tôm', 'kg', 24.00, 4.00 UNION ALL
  SELECT 'Mực', 'kg', 18.00, 3.00 UNION ALL
  SELECT 'Cá phi lê', 'kg', 22.00, 4.00 UNION ALL
  SELECT 'Trứng gà', 'quả', 240.00, 40.00 UNION ALL
  SELECT 'Đậu hũ', 'miếng', 100.00, 20.00 UNION ALL
  SELECT 'Rau cải', 'kg', 35.00, 6.00 UNION ALL
  SELECT 'Xà lách', 'kg', 18.00, 3.00 UNION ALL
  SELECT 'Cà chua', 'kg', 24.00, 4.00 UNION ALL
  SELECT 'Dưa leo', 'kg', 22.00, 4.00 UNION ALL
  SELECT 'Cà rốt', 'kg', 20.00, 4.00 UNION ALL
  SELECT 'Khoai tây', 'kg', 28.00, 5.00 UNION ALL
  SELECT 'Hành lá', 'kg', 8.00, 2.00 UNION ALL
  SELECT 'Hành tím', 'kg', 10.00, 2.00 UNION ALL
  SELECT 'Tỏi', 'kg', 10.00, 2.00 UNION ALL
  SELECT 'Sả', 'kg', 8.00, 2.00 UNION ALL
  SELECT 'Ớt', 'kg', 6.00, 1.00 UNION ALL
  SELECT 'Chanh', 'kg', 12.00, 2.00 UNION ALL
  SELECT 'Nấm rơm', 'kg', 12.00, 2.00 UNION ALL
  SELECT 'Nấm kim châm', 'kg', 10.00, 2.00 UNION ALL
  SELECT 'Gia vị nêm', 'kg', 20.00, 4.00 UNION ALL
  SELECT 'Nước mắm', 'lít', 18.00, 3.00 UNION ALL
  SELECT 'Dầu ăn', 'lít', 30.00, 5.00 UNION ALL
  SELECT 'Sữa đặc', 'lon', 60.00, 10.00 UNION ALL
  SELECT 'Cà phê', 'kg', 10.00, 2.00 UNION ALL
  SELECT 'Trà', 'kg', 8.00, 2.00 UNION ALL
  SELECT 'Đường', 'kg', 35.00, 6.00 UNION ALL
  SELECT 'Sữa tươi', 'lít', 40.00, 8.00 UNION ALL
  SELECT 'Bột cacao', 'kg', 6.00, 1.00 UNION ALL
  SELECT 'Nước ngọt lon', 'lon', 180.00, 30.00 UNION ALL
  SELECT 'Nước suối', 'chai', 220.00, 40.00 UNION ALL
  SELECT 'Cam', 'kg', 26.00, 5.00 UNION ALL
  SELECT 'Dưa hấu', 'kg', 30.00, 5.00 UNION ALL
  SELECT 'Chuối', 'kg', 24.00, 4.00 UNION ALL
  SELECT 'Bột năng', 'kg', 8.00, 2.00 UNION ALL
  SELECT 'Đậu xanh', 'kg', 12.00, 2.00 UNION ALL
  SELECT 'Nước cốt dừa', 'lít', 18.00, 3.00
) AS seed_ingredients
WHERE NOT EXISTS (
  SELECT 1 FROM ingredients i WHERE i.name = seed_ingredients.name
);

-- Menu items
INSERT INTO menu_items (name, description, price, category_id, image_url, is_visible)
SELECT name, description, price, category_id, NULL, 1
FROM (
  SELECT 'Cơm bò lúc lắc' AS name, 'Bò xào mềm, ăn kèm cơm trắng và rau tươi.' AS description, 79000.00 AS price, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') AS category_id UNION ALL
  SELECT 'Cơm gà xối mỡ', 'Gà chiên da giòn, cơm nóng và nước mắm chua ngọt.', 69000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Cơm sườn nướng', 'Sườn heo nướng đậm vị, ăn kèm dưa leo và cà chua.', 75000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Cơm tấm đặc biệt', 'Sườn, trứng, chả ăn cùng cơm tấm và nước mắm.', 85000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Phở bò tái', 'Phở bò nước dùng thơm, thịt bò tái mềm.', 65000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Phở gà', 'Phở gà thanh vị, dùng kèm rau thơm và chanh.', 59000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Bún bò Huế', 'Bún bò cay nhẹ, thơm sả, nước dùng đậm đà.', 69000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Bún thịt nướng', 'Thịt heo nướng, bún tươi, rau sống và nước mắm.', 62000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Mì xào hải sản', 'Mì trứng xào tôm, mực và rau cải.', 79000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Mì xào bò', 'Mì trứng xào bò, rau cải và sốt đậm vị.', 72000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Gà kho sả ớt', 'Gà kho thơm sả, cay nhẹ, ăn kèm cơm trắng.', 72000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Cá chiên nước mắm', 'Cá phi lê chiên giòn áo nước mắm tỏi.', 78000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Tôm rang me', 'Tôm rang sốt me chua ngọt hấp dẫn.', 89000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Mực xào sa tế', 'Mực xào sa tế cùng rau cải và hành tỏi.', 89000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Đậu hũ nấm sốt tiêu', 'Đậu hũ và nấm sốt tiêu thơm, phù hợp món chay.', 59000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Lẩu nấm hải sản', 'Lẩu nấm với tôm, mực, rau và nước dùng ngọt thanh.', 189000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món chính') UNION ALL
  SELECT 'Gỏi cuốn tôm thịt', 'Gỏi cuốn tươi với tôm, thịt, rau và bún.', 49000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món phụ') UNION ALL
  SELECT 'Chả giò hải sản', 'Chả giò nhân hải sản chiên giòn.', 59000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món phụ') UNION ALL
  SELECT 'Khoai tây chiên', 'Khoai tây chiên giòn dùng kèm sốt.', 39000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món phụ') UNION ALL
  SELECT 'Salad bò', 'Xà lách, dưa leo, cà chua và bò xào mềm.', 69000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món phụ') UNION ALL
  SELECT 'Rau cải xào tỏi', 'Rau cải xào nhanh với tỏi thơm.', 39000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món phụ') UNION ALL
  SELECT 'Trứng chiên thịt bằm', 'Trứng chiên cùng thịt bằm và hành lá.', 45000.00, (SELECT MIN(id) FROM categories WHERE name = 'Món phụ') UNION ALL
  SELECT 'Cà phê sữa đá', 'Cà phê phin pha sữa đặc, dùng với đá.', 29000.00, (SELECT MIN(id) FROM categories WHERE name = 'Đồ uống') UNION ALL
  SELECT 'Trà đào cam sả', 'Trà trái cây thơm cam, đào và sả.', 39000.00, (SELECT MIN(id) FROM categories WHERE name = 'Đồ uống') UNION ALL
  SELECT 'Nước cam ép', 'Cam tươi ép nguyên chất.', 39000.00, (SELECT MIN(id) FROM categories WHERE name = 'Đồ uống') UNION ALL
  SELECT 'Nước suối', 'Nước suối đóng chai.', 12000.00, (SELECT MIN(id) FROM categories WHERE name = 'Đồ uống') UNION ALL
  SELECT 'Coca-Cola', 'Nước ngọt có gas dùng lạnh.', 18000.00, (SELECT MIN(id) FROM categories WHERE name = 'Đồ uống') UNION ALL
  SELECT 'Chè đậu xanh', 'Chè đậu xanh nước cốt dừa béo nhẹ.', 29000.00, (SELECT MIN(id) FROM categories WHERE name = 'Tráng miệng') UNION ALL
  SELECT 'Chuối chiên', 'Chuối chiên giòn, ngọt thơm.', 32000.00, (SELECT MIN(id) FROM categories WHERE name = 'Tráng miệng') UNION ALL
  SELECT 'Dưa hấu tráng miệng', 'Dưa hấu cắt miếng dùng lạnh.', 29000.00, (SELECT MIN(id) FROM categories WHERE name = 'Tráng miệng')
) AS seed_menu
WHERE NOT EXISTS (
  SELECT 1 FROM menu_items m WHERE m.name = seed_menu.name
);

-- Recipes
DROP TEMPORARY TABLE IF EXISTS seed_recipes;
CREATE TEMPORARY TABLE seed_recipes (
  menu_name VARCHAR(100) NOT NULL,
  ingredient_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL
);

INSERT INTO seed_recipes (menu_name, ingredient_name, amount) VALUES
('Cơm bò lúc lắc', 'Gạo tẻ', 0.20), ('Cơm bò lúc lắc', 'Thịt bò', 0.18), ('Cơm bò lúc lắc', 'Cà chua', 0.06), ('Cơm bò lúc lắc', 'Dưa leo', 0.05), ('Cơm bò lúc lắc', 'Gia vị nêm', 0.02),
('Cơm gà xối mỡ', 'Gạo tẻ', 0.20), ('Cơm gà xối mỡ', 'Thịt gà', 0.25), ('Cơm gà xối mỡ', 'Dầu ăn', 0.04), ('Cơm gà xối mỡ', 'Dưa leo', 0.05), ('Cơm gà xối mỡ', 'Nước mắm', 0.02),
('Cơm sườn nướng', 'Gạo tẻ', 0.20), ('Cơm sườn nướng', 'Sườn heo', 0.25), ('Cơm sườn nướng', 'Dưa leo', 0.05), ('Cơm sườn nướng', 'Tỏi', 0.01), ('Cơm sườn nướng', 'Gia vị nêm', 0.02),
('Cơm tấm đặc biệt', 'Gạo tẻ', 0.22), ('Cơm tấm đặc biệt', 'Sườn heo', 0.22), ('Cơm tấm đặc biệt', 'Trứng gà', 1.00), ('Cơm tấm đặc biệt', 'Thịt heo', 0.08), ('Cơm tấm đặc biệt', 'Nước mắm', 0.02),
('Phở bò tái', 'Phở khô', 0.16), ('Phở bò tái', 'Thịt bò', 0.14), ('Phở bò tái', 'Hành lá', 0.01), ('Phở bò tái', 'Chanh', 0.03), ('Phở bò tái', 'Gia vị nêm', 0.02),
('Phở gà', 'Phở khô', 0.16), ('Phở gà', 'Thịt gà', 0.18), ('Phở gà', 'Hành lá', 0.01), ('Phở gà', 'Chanh', 0.03), ('Phở gà', 'Gia vị nêm', 0.02),
('Bún bò Huế', 'Bún tươi', 0.22), ('Bún bò Huế', 'Thịt bò', 0.14), ('Bún bò Huế', 'Sả', 0.03), ('Bún bò Huế', 'Ớt', 0.01), ('Bún bò Huế', 'Gia vị nêm', 0.03),
('Bún thịt nướng', 'Bún tươi', 0.22), ('Bún thịt nướng', 'Thịt heo', 0.18), ('Bún thịt nướng', 'Xà lách', 0.04), ('Bún thịt nướng', 'Dưa leo', 0.05), ('Bún thịt nướng', 'Nước mắm', 0.02),
('Mì xào hải sản', 'Mì trứng', 0.18), ('Mì xào hải sản', 'Tôm', 0.10), ('Mì xào hải sản', 'Mực', 0.10), ('Mì xào hải sản', 'Rau cải', 0.08), ('Mì xào hải sản', 'Dầu ăn', 0.03),
('Mì xào bò', 'Mì trứng', 0.18), ('Mì xào bò', 'Thịt bò', 0.16), ('Mì xào bò', 'Rau cải', 0.08), ('Mì xào bò', 'Tỏi', 0.01), ('Mì xào bò', 'Dầu ăn', 0.03),
('Gà kho sả ớt', 'Gạo tẻ', 0.20), ('Gà kho sả ớt', 'Thịt gà', 0.24), ('Gà kho sả ớt', 'Sả', 0.03), ('Gà kho sả ớt', 'Ớt', 0.01), ('Gà kho sả ớt', 'Nước mắm', 0.02),
('Cá chiên nước mắm', 'Gạo tẻ', 0.20), ('Cá chiên nước mắm', 'Cá phi lê', 0.22), ('Cá chiên nước mắm', 'Dầu ăn', 0.04), ('Cá chiên nước mắm', 'Tỏi', 0.01), ('Cá chiên nước mắm', 'Nước mắm', 0.03),
('Tôm rang me', 'Gạo tẻ', 0.20), ('Tôm rang me', 'Tôm', 0.22), ('Tôm rang me', 'Tỏi', 0.01), ('Tôm rang me', 'Đường', 0.02), ('Tôm rang me', 'Gia vị nêm', 0.02),
('Mực xào sa tế', 'Gạo tẻ', 0.20), ('Mực xào sa tế', 'Mực', 0.22), ('Mực xào sa tế', 'Rau cải', 0.08), ('Mực xào sa tế', 'Ớt', 0.01), ('Mực xào sa tế', 'Dầu ăn', 0.03),
('Đậu hũ nấm sốt tiêu', 'Gạo tẻ', 0.20), ('Đậu hũ nấm sốt tiêu', 'Đậu hũ', 2.00), ('Đậu hũ nấm sốt tiêu', 'Nấm rơm', 0.12), ('Đậu hũ nấm sốt tiêu', 'Tỏi', 0.01), ('Đậu hũ nấm sốt tiêu', 'Gia vị nêm', 0.02),
('Lẩu nấm hải sản', 'Tôm', 0.25), ('Lẩu nấm hải sản', 'Mực', 0.25), ('Lẩu nấm hải sản', 'Nấm kim châm', 0.20), ('Lẩu nấm hải sản', 'Rau cải', 0.20), ('Lẩu nấm hải sản', 'Gia vị nêm', 0.05),
('Gỏi cuốn tôm thịt', 'Bún tươi', 0.10), ('Gỏi cuốn tôm thịt', 'Tôm', 0.08), ('Gỏi cuốn tôm thịt', 'Thịt heo', 0.08), ('Gỏi cuốn tôm thịt', 'Xà lách', 0.04), ('Gỏi cuốn tôm thịt', 'Dưa leo', 0.04),
('Chả giò hải sản', 'Tôm', 0.10), ('Chả giò hải sản', 'Mực', 0.08), ('Chả giò hải sản', 'Cà rốt', 0.05), ('Chả giò hải sản', 'Dầu ăn', 0.05), ('Chả giò hải sản', 'Gia vị nêm', 0.02),
('Khoai tây chiên', 'Khoai tây', 0.25), ('Khoai tây chiên', 'Dầu ăn', 0.06), ('Khoai tây chiên', 'Gia vị nêm', 0.01),
('Salad bò', 'Thịt bò', 0.12), ('Salad bò', 'Xà lách', 0.08), ('Salad bò', 'Cà chua', 0.06), ('Salad bò', 'Dưa leo', 0.05), ('Salad bò', 'Chanh', 0.02),
('Rau cải xào tỏi', 'Rau cải', 0.20), ('Rau cải xào tỏi', 'Tỏi', 0.02), ('Rau cải xào tỏi', 'Dầu ăn', 0.03), ('Rau cải xào tỏi', 'Gia vị nêm', 0.01),
('Trứng chiên thịt bằm', 'Trứng gà', 2.00), ('Trứng chiên thịt bằm', 'Thịt heo', 0.08), ('Trứng chiên thịt bằm', 'Hành lá', 0.01), ('Trứng chiên thịt bằm', 'Dầu ăn', 0.03),
('Cà phê sữa đá', 'Cà phê', 0.03), ('Cà phê sữa đá', 'Sữa đặc', 0.20), ('Cà phê sữa đá', 'Đường', 0.02),
('Trà đào cam sả', 'Trà', 0.02), ('Trà đào cam sả', 'Cam', 0.12), ('Trà đào cam sả', 'Sả', 0.02), ('Trà đào cam sả', 'Đường', 0.03),
('Nước cam ép', 'Cam', 0.35), ('Nước cam ép', 'Đường', 0.02),
('Nước suối', 'Nước suối', 1.00),
('Coca-Cola', 'Nước ngọt lon', 1.00),
('Chè đậu xanh', 'Đậu xanh', 0.08), ('Chè đậu xanh', 'Nước cốt dừa', 0.08), ('Chè đậu xanh', 'Đường', 0.05),
('Chuối chiên', 'Chuối', 0.18), ('Chuối chiên', 'Bột năng', 0.05), ('Chuối chiên', 'Dầu ăn', 0.05), ('Chuối chiên', 'Đường', 0.02),
('Dưa hấu tráng miệng', 'Dưa hấu', 0.30);

INSERT INTO recipes (menu_item_id, ingredient_id, amount)
SELECT menu_items_by_name.id, ingredients_by_name.id, sr.amount
FROM seed_recipes sr
JOIN (
  SELECT name, MIN(id) AS id
  FROM menu_items
  GROUP BY name
) AS menu_items_by_name ON menu_items_by_name.name = sr.menu_name
JOIN (
  SELECT name, MIN(id) AS id
  FROM ingredients
  GROUP BY name
) AS ingredients_by_name ON ingredients_by_name.name = sr.ingredient_name
WHERE NOT EXISTS (
  SELECT 1
  FROM recipes r
  WHERE r.menu_item_id = menu_items_by_name.id
    AND r.ingredient_id = ingredients_by_name.id
);

DROP TEMPORARY TABLE IF EXISTS seed_recipes;

COMMIT;

