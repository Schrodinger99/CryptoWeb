DROP DATABASE IF EXISTS CryptoGame;

CREATE DATABASE CryptoGame;

USE CryptoGame;

CREATE TABLE Usuarios(
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nacionalidad VARCHAR(50) NOT NULL, 
    fecha_nacimiento DATE NOT NULL,
    contrasena VARCHAR(30) NOT NULL,
    correo VARCHAR (321) NOT NULL UNIQUE, /*Máxima longitud permitida de un correo*/
    coins INT NOT NULL DEFAULT 0 CHECK(coins >= 0),
    nombre_user VARCHAR(30) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    nombre_comp VARCHAR(150) NOT NULL,
    vidas INT,
    analyst BOOL DEFAULT FALSE,
    CHECK (CHAR_LENGTH(contrasena) >= 8 AND contrasena REGEXP '[A-Z]' AND contrasena REGEXP '[a-z]')
);

CREATE TABLE Quests(
    id_quest INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descrip_quest VARCHAR(255),
    recompensa INT
);

CREATE TABLE Usuario_quest(
    id_usuario INT,
    id_quest INT,
    completado BOOL DEFAULT FALSE,
    PRIMARY KEY (id_usuario, id_quest),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_quest) REFERENCES Quests(id_quest) ON DELETE CASCADE
);

CREATE TABLE Items(
	id_item INT AUTO_INCREMENT PRIMARY KEY,
    descrip_item VARCHAR(255)
);

CREATE TABLE Item_Usuario(
	id_item INT,
    id_usuario INT,
    cantidad INT DEFAULT 0,
    PRIMARY KEY (id_item, id_usuario),	
    FOREIGN KEY (id_item) REFERENCES Items(id_item) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE Modulos(
    id_modulo INT AUTO_INCREMENT PRIMARY KEY,
    descrip_mod VARCHAR(200) NOT NULL,
    nombre_mod VARCHAR(200) NOT NULL,
    costo INT NOT NULL CHECK(costo > 0)
);

CREATE TABLE Progreso(
    id_usuario INT,
    id_modulo INT,
    porce_complet DECIMAL(5,2) DEFAULT 0.00 NOT NULL CHECK(porce_complet BETWEEN 0.00 AND 1.00),
    desbloqueado BOOL DEFAULT FALSE NOT NULL,
    PRIMARY KEY (id_usuario, id_modulo),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_modulo) REFERENCES Modulos(id_modulo) ON DELETE CASCADE
);

CREATE TABLE Quizzes(
    id_quiz INT AUTO_INCREMENT PRIMARY KEY,
    id_modulo INT,
    puntos_max INT NOT NULL,
    penalizacion INT NOT NULL,
    nombre_quiz VARCHAR(255) NOT NULL,
    FOREIGN KEY (id_modulo) REFERENCES Modulos(id_modulo) ON DELETE CASCADE
);

CREATE TABLE Quiz_Usuario(
	id_quiz INT,
    id_usuario INT,
    desbloqueado BOOL DEFAULT False,
    estrellas INT DEFAULT 0,
    puntos INT DEFAULT 0,
    PRIMARY KEY (id_quiz, id_usuario),
    FOREIGN KEY (id_quiz) REFERENCES Quizzes(id_quiz) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE Contenido(
    id_contenido INT PRIMARY KEY AUTO_INCREMENT,
    id_quiz INT,
    duracion INT NOT NULL CHECK(duracion > 0),
    url VARCHAR(1024) NOT NULL, /*Las urls pueden ser muy largas y no se si las vamos a acortar*/
    FOREIGN KEY (id_quiz) REFERENCES Quizzes(id_quiz) ON DELETE CASCADE
);

CREATE TABLE Preguntas(
    id_pregunta INT PRIMARY KEY AUTO_INCREMENT,
    id_quiz INT,
    explicacion VARCHAR(255) NOT NULL,
    tip VARCHAR(255) NOT NULL,
    indice_correcto INT NOT NULL,
    pregunta VARCHAR(255) NOT NULL,
    FOREIGN KEY (id_quiz) REFERENCES Quizzes(id_quiz) ON DELETE CASCADE
);

 /*Es una entidad debil*/
CREATE TABLE Respuestas_Quiz(
    id_pregunta INT,
    respuesta VARCHAR(150) NOT NULL,
    indice INT,
    PRIMARY KEY (id_pregunta, indice),
    FOREIGN KEY (id_pregunta) REFERENCES Preguntas(id_pregunta) ON DELETE CASCADE
);

CREATE TABLE Usuario_Pregunta(
    id_pregunta INT,
    id_usuario INT,
    intentos INT DEFAULT 0,
    resuelta BOOL DEFAULT FALSE,
    PRIMARY KEY(id_pregunta, id_usuario),
    FOREIGN KEY (id_pregunta) REFERENCES Preguntas(id_pregunta) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE Memoramas(
	id_memorama INT PRIMARY KEY AUTO_INCREMENT,
    id_quiz INT,
    FOREIGN KEY (id_quiz) REFERENCES Quizzes(id_quiz) ON DELETE CASCADE
);

CREATE TABLE Respuestas_Memorama(
	id_respuesta INT AUTO_INCREMENT,
    id_memorama INT,
    concepto VARCHAR(50),
    definicion VARCHAR(255),
    PRIMARY KEY (id_respuesta, id_memorama),
    FOREIGN KEY (id_memorama) REFERENCES Memoramas(id_memorama) ON DELETE CASCADE
);

CREATE TABLE Usuario_Memorama(
	id_memorama INT,
    id_usuario INT,
    intentos INT DEFAULT 0,
    resuelta BOOL DEFAULT FALSE,
    PRIMARY KEY(id_memorama, id_usuario),
    FOREIGN KEY (id_memorama) REFERENCES Memoramas(id_memorama) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE Ahorcados(
	id_ahorcado INT PRIMARY KEY AUTO_INCREMENT,
    id_quiz INT,
    FOREIGN KEY (id_quiz) REFERENCES Quizzes(id_quiz) ON DELETE CASCADE
);

CREATE TABLE Respuestas_Ahorcado(
	id_respuesta INT AUTO_INCREMENT,
    id_ahorcado INT,
    concepto VARCHAR(50),
    definicion VARCHAR(255),
    PRIMARY KEY (id_respuesta, id_ahorcado),
    FOREIGN KEY (id_ahorcado) REFERENCES Ahorcados(id_ahorcado) ON DELETE CASCADE
);

CREATE TABLE Usuario_Ahorcado(
	id_ahorcado INT,
    id_usuario INT,
    intentos INT DEFAULT 0,
    resuelta BOOL DEFAULT FALSE,
    PRIMARY KEY(id_ahorcado, id_usuario),
    FOREIGN KEY (id_ahorcado) REFERENCES Ahorcados(id_ahorcado) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

/* ------------------------------------------------------------------------------------------------------------------
---------------------------------------------- INSERTS DE DATOS PRUEBA ----------------------------------------------
-------------------------------------------------------------------------------------------------------------------*/

-- Quests
INSERT INTO Quests (id_quest, nombre, descrip_quest, recompensa)
VALUES
(1, 'Trivia Lunes', 'Trivia sobre blockchain general', 10),
(2, 'Trivia Martes', 'Trivia intermedia de criptomonedas', 10),
(3, 'Trivia Miércoles', 'Trivia sobre smart contracts', 15),
(4, 'Memorama Lunes', 'Memorama de términos básicos', 12),
(5, 'Memorama Martes', 'Memorama de conceptos DeFi', 12),
(6, 'Lección Blockchain', 'Lección introductoria sobre blockchain', 20),
(7, 'Lección Criptomonedas', 'Lección sobre tipos de criptomonedas', 20),
(8, 'Exploración NFTs', 'Exploración de casos de uso de NFTs', 25),
(9, 'Exploración DAO', 'Exploración de organizaciones autónomas', 25),
(10, 'Exploración Seguridad', 'Exploración de ciberseguridad en Web3', 30);

-- Modulos
INSERT INTO Modulos (id_modulo, descrip_mod, nombre_mod, costo)
VALUES
(1, 'Introducción a los conceptos básicos de blockchain', 'Introducción a Blockchain', 100),
(2, 'Conceptos esenciales sobre criptomonedas y sus usos', 'Criptomonedas Básicas', 150),
(3, 'Fundamentos de contratos inteligentes y automatización', 'Smart Contracts', 200);

-- Quizzes
INSERT INTO Quizzes (id_quiz, id_modulo, puntos_max, penalizacion, nombre_quiz)
VALUES
(1, 1, 100, 5, 'Quiz Blockchain'),
(2, 3, 100, 5, 'Quiz Smart Contracts'),
(3, 2, 100, 5, 'Quiz DeFi'),
(4, 2, 100, 5, 'Quiz NFTs');

-- Preguntas
INSERT INTO Preguntas (id_pregunta, id_quiz, explicacion, tip, indice_correcto, pregunta)
VALUES
(1, 1, 'Explicación del smart contract', 'Revisa los videos del módulo', 2, '¿Qué es un smart contract?'),
(2, 1, 'Explicación sobre blockchain', 'Consulta el glosario del módulo 1', 1, '¿Cómo funciona una blockchain?');

-- Usuarios
INSERT INTO Usuarios (id_usuario, nacionalidad, fecha_nacimiento, contrasena, correo, coins, nombre_user, fecha_registro, nombre_comp, vidas, analyst)
VALUES
(1, 'México', '1991-03-28', 'Password1A', 'user1@crypto.com', 114, 'Usuario 1', '2025-04-08', 'Nombre Completo 1', 3, FALSE),
(2, 'México', '1992-06-13', 'Password2A', 'user2@crypto.com', 79, 'Usuario 2', '2025-03-24', 'Nombre Completo 2', 1, FALSE),
(3, 'Sudamerica', '1993-08-12', 'Password3A', 'user3@crypto.com', 311, 'Usuario 3', '2025-03-22', 'Nombre Completo 3', 3, FALSE),
(4, 'Sudamerica', '1994-05-12', 'Password4A', 'user4@crypto.com', 190, 'Usuario 4', '2025-02-28', 'Nombre Completo 4', 2, FALSE),
(5, 'Europa', '1995-02-24', 'Password5A', 'user5@crypto.com', 384, 'Usuario 5', '2025-04-18', 'Nombre Completo 5', 5, FALSE);

-- Usuario_quest
INSERT INTO Usuario_quest (id_usuario, id_quest, completado)
VALUES
(1, 1, TRUE), (1, 2, FALSE), (1, 3, FALSE), (1, 4, FALSE), (1, 5, FALSE),
(1, 6, FALSE), (1, 7, TRUE), (1, 8, FALSE), (1, 9, FALSE), (1, 10, TRUE),
(2, 1, TRUE), (2, 2, FALSE), (2, 3, TRUE), (2, 4, FALSE), (2, 5, TRUE),
(2, 6, FALSE), (2, 7, TRUE), (2, 8, TRUE), (2, 9, TRUE), (2, 10, FALSE),
(3, 1, FALSE), (3, 2, TRUE), (3, 3, FALSE), (3, 4, TRUE), (3, 5, FALSE),
(3, 6, FALSE), (3, 7, TRUE), (3, 8, FALSE), (3, 9, TRUE), (3, 10, TRUE),
(4, 1, TRUE), (4, 2, FALSE), (4, 3, FALSE), (4, 4, FALSE), (4, 5, TRUE),
(4, 6, TRUE), (4, 7, TRUE), (4, 8, FALSE), (4, 9, TRUE), (4, 10, TRUE),
(5, 1, FALSE), (5, 2, TRUE), (5, 3, TRUE), (5, 4, TRUE), (5, 5, TRUE),
(5, 6, TRUE), (5, 7, TRUE), (5, 8, TRUE), (5, 9, TRUE), (5, 10, TRUE);

-- Progreso
INSERT INTO Progreso (id_usuario, id_modulo, porce_complet, desbloqueado)
VALUES
(1, 1, 0.95, TRUE), (1, 2, 0.63, TRUE), (1, 3, 0.95, TRUE),
(2, 1, 0.33, TRUE), (2, 2, 0.95, FALSE), (2, 3, 0.52, TRUE),
(3, 1, 0.64, TRUE), (3, 2, 0.90, TRUE), (3, 3, 0.61, TRUE),
(4, 1, 0.91, TRUE), (4, 2, 0.97, FALSE), (4, 3, 0.69, TRUE);

-- Quiz_Usuario
INSERT INTO Quiz_Usuario (id_quiz, id_usuario, desbloqueado, estrellas, puntos)
VALUES
(1, 1, TRUE, 4, 85),
(2, 2, TRUE, 4, 100),
(3, 3, TRUE, 5, 82),
(4, 4, TRUE, 4, 99);

-- Usuario_Pregunta
INSERT INTO Usuario_Pregunta (id_pregunta, id_usuario, intentos, resuelta)
VALUES
(1, 1, 5, FALSE),
(2, 2, 3, TRUE);