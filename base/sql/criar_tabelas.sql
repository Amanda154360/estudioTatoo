DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS funcionarios;

/*daqui pra baixo vc altera o que deve*/

CREATE TABLE IF NOT EXISTS console (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  empresa VARCHAR(100) NOT NULL,
  ano_lancamento INT NOT NULL
);

CREATE TABLE IF NOT EXISTS jogo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  genero VARCHAR(100) NOT NULL,
  tipo_midia VARCHAR(50) NOT NULL,
  ano_lancamento INT NOT NULL
);

INSERT INTO console (titulo, empresa, ano_lancamento) VALUES
  ('PlayStation 5', 'Sony', 2020),
  ('Xbox Series X', 'Microsoft', 2020),
  ('Nintendo Switch', 'Nintendo', 2017),
  ('PlayStation 4', 'Sony', 2013),
  ('Xbox 360', 'Microsoft', 2005);

INSERT INTO jogo (titulo, genero, tipo_midia, ano_lancamento) VALUES
  ('Joguinho oi prof te amamos da 10 p noix', 'Suspense', 'Digital', 2026),
  ('The Legend of Zelda: Breath of the Wild', 'Aventura', 'Fisico', 2017),
  ('God of War Ragnarok', 'Acao', 'Fisico', 2022),
  ('The Witcher 3: Wild Hunt', 'RPG', 'Digital', 2015),
  ('Super Mario Odyssey', 'Plataforma', 'Fisico', 2017),
  ('Elden Ring', 'RPG', 'Digital', 2022),
  ('Halo Infinite', 'FPS', 'Digital', 2021),
  ('Minecraft', 'Sandbox', 'Digital', 2011),
  ('Red Dead Redemption 2', 'Acao', 'Fisico', 2018),
  ('Animal Crossing: New Horizons', 'Simulacao', 'Fisico', 2020),
  ('Cyberpunk 2077', 'RPG', 'Digital', 2020);
