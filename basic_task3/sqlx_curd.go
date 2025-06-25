package main

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // PostgreSQL 驱动
)

type Employee struct {
	ID         int     `db:"id"`
	Name       string  `db:"name"`
	Department string  `db:"department"`
	Salary     float64 `db:"salary"`
}

func sqlxCurd() {
	db, err := sqlx.Connect("postgres", "host=localhost user=postgres password=postgres dbname=mydb port=5432 sslmode=disable")
	if err != nil {
		fmt.Println("连接数据库失败:", err)
		return
	}
	defer db.Close()
	fmt.Println("连接数据库成功")
	// // create Employee table
	// _, err = db.Exec(`CREATE TABLE IF NOT EXISTS Employee (
	// 	ID SERIAL PRIMARY KEY,
	// 	Name VARCHAR(50) NOT NULL,
	// 	Department VARCHAR(50) NOT NULL,
	// 	Salary NUMERIC(10, 2) NOT NULL
	// )`)
	// if err != nil {
	// 	fmt.Println("创建 Employee 表失败:", err)
	// 	return
	// }
	// fmt.Println("Employee 表创建成功")
	// // Insert data into Employee table
	// _, err = db.Exec(`INSERT INTO Employee (Name, Department, Salary) VALUES
	// 	('Alice', 'Engineering', 60000),
	// 	('Bob', 'Marketing', 50000),
	// 	('Charlie', 'Sales', 55000),
	// 	('David', 'Technology', 70000),
	// 	('Eve', 'Technology', 75000),
	// 	('Frank', 'Technology', 80000)`)
	// if err != nil {
	// 	fmt.Println("插入数据失败:", err)
	// 	return
	// }
	// fmt.Println("数据插入成功")

	// Query data from Employee table
	var employees []Employee
	err = db.Select(&employees, "SELECT * FROM Employee WHERE department = $1", "Technology")
	if err != nil {
		fmt.Println("查询数据失败:", err)
		return
	}
	fmt.Println("Employees from Technology Department:")
	for _, emp := range employees {
		fmt.Printf("ID: %d, Name: %s, Department: %s, Salary: %.2f\n", emp.ID, emp.Name, emp.Department, emp.Salary)
	}

	// Query the employee with the highest salary
	var highestSalaryEmployee Employee
	err = db.Get(&highestSalaryEmployee, "SELECT * FROM Employee ORDER BY Salary DESC LIMIT 1")
	if err != nil {
		fmt.Println("查询最高薪资员工失败:", err)
		return
	}
	fmt.Printf("Highest Salary Employee: ID: %d, Name: %s, Department: %s, Salary: %.2f\n",
		highestSalaryEmployee.ID, highestSalaryEmployee.Name, highestSalaryEmployee.Department, highestSalaryEmployee.Salary)
}

type Books struct {
	ID     int     `db:"id"`
	Title  string  `db:"title"`
	Author string  `db:"author"`
	Price  float64 `db:"price"`
}

func sqlxCurdBooks() {
	db, err := sqlx.Connect("postgres", "host=localhost user=postgres password=postgres dbname=mydb port=5432 sslmode=disable")
	if err != nil {
		fmt.Println("连接数据库失败:", err)
		return
	}
	defer db.Close()
	fmt.Println("连接数据库成功")

	// // Create Books table
	// _, err = db.Exec(`CREATE TABLE IF NOT EXISTS Books (
	// 	ID SERIAL PRIMARY KEY,
	// 	Title VARCHAR(100) NOT NULL,
	// 	Author VARCHAR(100) NOT NULL,
	// 	Price NUMERIC(10, 2) NOT NULL
	// )`)
	// if err != nil {
	// 	fmt.Println("创建 Books 表失败:", err)
	// 	return
	// }
	// fmt.Println("Books 表创建成功")

	// // Insert data into Books table
	// _, err = db.Exec(`INSERT INTO Books (Title, Author, Price) VALUES
	// 	('Go Programming', 'John Doe', 29.99),
	// 	('Advanced Go', 'Jane Smith', 39.99),
	// 	('Database Design', 'Alice Johnson', 49.99),
	// 	('Web Development with Go', 'Bob Brown', 34.99),
	// 	('Microservices in Go', 'Charlie White', 44.99)`)
	// if err != nil {
	// 	fmt.Println("插入数据失败:", err)
	// 	return
	// }
	// fmt.Println("数据插入成功")

	// Query books with price greater than 40
	var expensiveBooks []Books
	err = db.Select(&expensiveBooks, "SELECT * FROM Books WHERE Price > $1", 40.00)
	if err != nil {
		fmt.Println("查询价格大于40的书籍失败:", err)
		return
	}
	fmt.Println("Books with Price greater than 40:")
	for _, book := range expensiveBooks {
		fmt.Printf("ID: %d, Title: %s, Author: %s, Price: %.2f\n", book.ID, book.Title, book.Author, book.Price)
	}
}
