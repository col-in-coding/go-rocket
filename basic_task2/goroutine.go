package main

import (
	"fmt"
	"sync"
)

func goroutine() {

	var wg sync.WaitGroup
	wg.Add(2) // Add two goroutines to the wait group

	// done := make(chan bool)

	go func() {
		defer wg.Done()
		for i := 0; i <= 10; i = i + 2 {
			fmt.Println("Goroutine one:", i)
		}
		// done <- true
	}()

	go func() {
		defer wg.Done()
		for i := 1; i <= 10; i = i + 2 {
			fmt.Println("Goroutine two:", i)
		}
		// done <- true
	}()
	// Wait for goroutines to finish
	// <-done
	// <-done
	wg.Wait()

	fmt.Println("All goroutines finished")
}
