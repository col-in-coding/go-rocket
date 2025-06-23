package main

import (
	"fmt"
	"math/rand"
	"time"
)

func task(i int, ch chan<- int) {
	start := time.Now()
	// Simulate a task that takes a random amount of time
	duration := time.Duration(rand.Intn(2)+1) * time.Second

	for j := 0; j <= i; j++ {
		time.Sleep(duration)
	}
	elapsed := time.Since(start)
	fmt.Printf("Task %d completed in %s\n", i, elapsed)
	ch <- i
}

func goroutine2() {
	var ch = make(chan int, 10) // Buffered channel to hold completion times
	for i := range 10 {
		go task(i, ch)
	}

	timeout := time.After(20 * time.Second)
	for {
		select {
		case tasknum := <-ch:
			fmt.Printf("Received completion signal for task %d\n", tasknum)
		case <-timeout:
			fmt.Println("Timeout reached, exiting...")
			return
		default:
			fmt.Println("No tasks completed yet, waiting...")
			time.Sleep(500 * time.Millisecond) // Sleep to avoid busy waiting
		}
	}

}
