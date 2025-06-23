func isValid(s string) bool {
    stack := []rune{}
    for _, b := range s {
        length := len(stack)
        if length == 0 {
            stack = append(stack, b)
            continue
        }

        top := stack[length-1]
        if b == ')' && top == '(' {
            stack = stack[:length-1]
        } else if b == '}' && top == '{' {
            stack = stack[:length-1]
        } else if b == ']' && top == '[' {
            stack = stack[:length-1]
        } else {
            stack = append(stack, b)
        }
    }
    return len(stack) == 0
}