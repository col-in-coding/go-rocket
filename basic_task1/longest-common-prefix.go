func longestCommonPrefix(strs []string) string {
    if len(strs) == 0{
        return ""
    }
    if len(strs) == 1 || strs[0] == "" {
        return strs[0]
    }
    res := []byte{}
    i := 0
end:
    for {
        for j, str := range strs {
            if i >= len(str) {break end}
            if j == 0 {continue}
            if str[i] != strs[0][i] {break end}
        }
        res = append(res, strs[0][i])
        i++
    }
    return string(res)
}