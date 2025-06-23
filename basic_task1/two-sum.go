func twoSum(nums []int, target int) []int {
    res := []int{}
    m := make(map[int][]int)
    for i, num := range nums {
        indices, ok := m[num]
        if !ok {
            m[num] = []int{i}
        } else {
            m[num] = append(indices, i)
        }
    }

    for num, indices := range m {
        indices2, ok := m[target - num]
        if !ok {
            continue
        }
        if len(indices) == 2{
            res = indices
            break
        } else if indices[0] != indices2[0] {
            res = append(res, indices[0], indices2[0])
            break
        }
    }
    return res
}