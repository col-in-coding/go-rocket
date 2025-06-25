INSERT INTO students (name, age, grade) VALUES ('张三', 20, '三年级');

SELECT * FROM students WHERE age > 18;

UPDATE students SET grade = '四年级' WHERE name = '张三';

DELETE FROM students WHERE age < 15;