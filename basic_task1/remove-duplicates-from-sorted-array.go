func removeDuplicates(nums []int) int {
    if len(nums) <= 1 {
        return len(nums)
    }
    i, j := 0, 1
    for {
        if nums[i] != nums[j] {
            i++
            nums[i], nums[j] = nums[j], nums[i]
        }
        j++
        if j == len(nums) {
            return i+1
        }
    }
}