package main

import (
	"fmt"
	"sync"
)

func channel() {
	wg := sync.WaitGroup{}
	ch := make(chan int, 5)

	wg.Add(2) // Add two goroutines to the wait group
	go func() {
		defer wg.Done()
		for i := range 10 {
			ch <- i // Send even numbers to the channel
		}
		close(ch) // Close the channel when done
	}()

	go func() {
		defer wg.Done()
		for {
			num, ok := <-ch // Receive from the channel
			if !ok {
				break // Exit if the channel is closed
			}
			fmt.Println("Received from channel:", num)
		}
	}()
	wg.Wait()
}
