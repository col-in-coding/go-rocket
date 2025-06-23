import "sort"

func merge(intervals [][]int) [][]int {
    if len(intervals) == 0 {
        return intervals
    }
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][0] < intervals[j][0]
    })
    res := append([][]int{}, intervals[0])
    for _, interval := range intervals {
        if interval[0] <= res[len(res) - 1][1] {
            res[len(res) - 1][1] = max(interval[1], res[len(res) - 1][1])
        } else {
            res = append(res, interval)
        }
    }
    return res
}