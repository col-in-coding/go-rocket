package main

import (
	"sync"
	"sync/atomic"
)

type Counter struct {
	mu    sync.Mutex
	count int
}

type Counter2 struct {
	count int64
}

func (c *Counter2) Increment() {
	atomic.AddInt64(&c.count, 1)
}

func countingTask(c *Counter, wg *sync.WaitGroup) {
	defer wg.Done()
	for range 1000 {
		c.mu.Lock()
		c.count++
		c.mu.Unlock()
	}
}

func mutax() {

	var wg sync.WaitGroup
	// c := &Counter{}
	c2 := &Counter2{}

	for range 10 {
		wg.Add(1)
		// go countingTask(c, &wg)

		go func(c2 *Counter2, wg *sync.WaitGroup) {
			defer wg.Done()
			for range 1000 {
				c2.Increment()
			}
		}(c2, &wg)
	}
	wg.Wait() // Wait for the goroutine to finish

	// Print the final count
	// println("Final count:", c.count)
	println("Final count:", c2.count)

}
