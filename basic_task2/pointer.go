package main

import "fmt"

func addTen(num *int) {
	if num == nil {
		return
	}
	*num += 10
}

func multiplyByTwo(nums []int) {
	if nums == nil {
		return
	}
	for i := range nums {
		nums[i] *= 2
	}
}

func pointer() {
	num := 5
	addTen(&num)
	// num is now 15
	fmt.Println(num)

	nums := []int{1, 2, 3, 4, 5}
	multiplyByTwo(nums)
	fmt.Println(nums)
}
