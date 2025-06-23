package main

import (
  "fmt"
  "gorm.io/driver/postgres"
  "gorm.io/gorm"
  "database/sql"
  "time"
  "errors"
)

type User struct {
  ID           uint           // Standard field for the primary key
  Name         string         // A regular string field
  Email        *string        // A pointer to a string, allowing for null values
  Age          uint8          // An unsigned 8-bit integer
  Birthday     *time.Time     // A pointer to time.Time, can be null
  MemberNumber sql.NullString // Uses sql.NullString to handle nullable strings
  ActivatedAt  sql.NullTime   // Uses sql.NullTime for nullable time fields
  CreatedAt    time.Time      // Automatically managed by GORM for creation time
  UpdatedAt    time.Time      // Automatically managed by GORM for update time
}


func main() {

  // https://github.com/go-gorm/postgres
  dsn := "host=localhost user=postgres password=postgres dbname=mydb port=5432 sslmode=disable TimeZone=Asia/Shanghai"
  db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
  fmt.Println("Connected to database", db, "with error", err)

  // // Migrate the schema
  // err = db.AutoMigrate(&User{})
  // fmt.Println("Migrated schema with error", err)

  // user := User{}
  // now := time.Now()
  // result := db.Create(&user)
  // fmt.Println("Created user", user, "with error", result)

  // db.Debug().Where(&User{Name: "jinzhu", Age: 0}).First(&user)
  // select from users where name = 'jinzhu'
  // res := db.Where(map[string]interface{}{"name": "Jinzhu"}).First(&user)
  // fmt.Println("Found user", user, "with error", res.Error)

  // results := []User{}
  // db.Distinct("name", "age").Order("name, age desc").Find(&results)
  // fmt.Println("Distinct results:", results)
}