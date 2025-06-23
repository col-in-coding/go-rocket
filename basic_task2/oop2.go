package main

import "fmt"

type Person struct {
	Name string
	Age  int
}

type Employee struct {
	Person
	EmployeeID string
}

func (e *Employee) PrintInfo() {
	fmt.Println("Employee Name:", e.Name, "\nAge:", e.Age, "\nEID:", e.EmployeeID)
}

func oop2() {
	emp := &Employee{
		Person:     Person{Name: "John Doe", Age: 30},
		EmployeeID: "E12345",
	}

	emp.PrintInfo()
}
