> 本文为 golang 官方对于其 append 方法，及其分别在 Array、slice、string 情形中运行机制的译文，原文地址：https://go.dev/blog/slices
> 运行代码的相关可自行在 Go 中运行，或访问本文的原文地址运行查看

## Arrays, Slices(与 strings): append 背后的机制

#### 引子

过程化编程语言(procedural programming language)最常见的特性之一便是 array(数组) 的概念。array 看上去挺简单的，但在将它加入到某个编程语言的时候还需要回答诸多问题：
- 固定大小(fixed-size) 还是可变大小(variable-size)
- 数组大小(size)是否是类型(type)的一部分
- 多维数组可能会长什么样
- 空数组是否有实际意义

这些问题的答案会关系到 array 到底仅仅是语言的一个特性，还是其设计的核心部分

在 Go 早期的开发过程中，我们花费了将近一年时间来确定这些问题的答案，之后才敲定了正确的设计。关键的步骤是 *slices(切片)* 的引入，它以固定大小的数组(fixed-size array)为基础，构建了一种灵活的、可扩展的数据结构。但是，一直到今天，新手 Go 程序员还是经常被 slice 的工作方式困扰，也许是因为其他语言的经验干扰了他们的思考

本文中，我们试着去消除误读、正本清源。我们会通过不同的示例，以解释 `append` 这个内置函数是如何工作的、以及为什么会这样工作，以此来达成正本清源的目的。

#### Arrays

Arrays 是在 Go 中非常重要的内置模块，但正如大厦的地基一样，它们经常被隐藏在其他可见的组件之下。在我们继续研究更加有趣、强大而又重要的 slice 以前，我们必先简要地讨论下 arrays。

array 一般不太会在 Go 程序中见到，因为 array 的大小(size)是其类型(type)的一部分，因而限制了其表达能力。

声明
```go
var buffer [256]byte
```
声明了变量 `buffer`，有 256 个字节大小，`buffer`的类型包含了其大小(size): `256[byte]`，另一个 512 byte 大小的 array 将会是另一种不同的类型`512[byte]`。

和某个 array 关联的数据仅仅表示：包含了多个元素的 array。若用图示来表示的话，我们的 buffer 在内存里看上去会是像这样的：
```go
buffer: byte byte byte ... 256 次 ... byte byte byte
```
也就是说，这个变量持有了 256 个 byte 的数据，仅此而已。我们可以通过熟悉的下标语法来访问其元素，`buffer[0]`、`buffer[1]`，依次类推，直到`buffer[255]`。尝试访问不在 array 范围内的元素会让程序崩溃。

有一个叫 `len` 的内置函数会返回 array、slice，以及其他一些数据类型中的元素个数，对于 array 来说，`len`能返回什么是显而易见的。在我们的这个例子里，`len(buffer)`会返回固定值256。

array 是有其合适用途的 ———— 比如它们是变换矩阵(transformation matrix)的优秀表达方式 ———— 但它们在 Go 中最常见的用途是作为 slice 的存储。

#### Slices: 切片头指针(The slice header)

slice 是存放操作的地方，但是要想合理地使用它们，我们必须先准确地理解它们是什么，以及它们要做什么。

slice 是这样一种数据结构，它描述了一个从这个 slice 变量自身开始的，一个独立存储的 array 的连续区块，*slice 不是 array*，slice **描述**一个 array。

假定我们已经有了上一单元的 buffer array 变量，我们可以通过切分数组，来创建一个从下标 100 到下标 150(不包含 150) 元素的 slice:
```go
var slice []byte = buffer[100:150]
```

在这个代码片段中，我们使用了显式完整的变量声明。变量 slice 具有类型 `[]byte`，读作 "slice of bytes"(byte 类型的 slice)，并从截断了下标 100(包含)到下标 150(不包含)的，命名为 buffer 的 array 中初始化而来。更简单的语法可以不用类型，通过下面的初始化表达式设置：
```go
var slice = buffer[100:150]
```
在函数里面，我们可以声明的简写形式：
```go
slice := buffer[100:150]
```

这个 slice 变量究竟是什么？这并不是完整的描述，但到目前为止，把 slice 当作只有两个元素的微波数据结构：一个是长度 length，另一个是指向 array 的指针。你可以认为其背后的结构类似下面这样：
```go
type sliceHeader struct {
  Length        int
  ZerothElement *byte
}

slice := sliceHeader{
  Length:         50,
  ZerothElement:  &buffer[100]
}
```

当然，这只是一种解释的方式。虽然这段代码所说的 `sliceHeader` 结构并不能被程序员实际看到，而且指针元素的类型实际取决于元素的类型，但这仍旧能够大致概括其机制。

目前我们在 array 之上进行了 slice 操作，我们也可以继续对 slice 切片，比如
```go
slice2 := slice[5:10]
```
像之前一样，这个操作创建了一个新的 slice，在这个例子里面，新的 slice 包含了下标 5 到下标 9(包含) 的元素，也就对应了原 array 中下标 105 到 109 对应的元素。`slice2` 底层的 `sliceHeader` 结构会长这样：
```go
slice2 := sliceHeader{
  Length:        5,
  ZerothElement: &buffer[105],
}
```
注意这个 header 仍旧指向同一个基础 array，存储在 `buffer` 中

我们也可以重新切片(reslice)，也就是对 slice 切片，并将结果存回到原先的 slice 结构中：
```go
slice = slice[5:10]
```
在这步操作以后，`slice` 的 `sliceHeader` 会和 `slice2` 相同。你会看到 reslice 技术应用十分普遍，比如为了截断一个 slice。下面语句删掉了第 1 个后最后一个元素:
```go
slice = slice[1:len(slice)-1]
```

你会经常听到资深的 Go 程序员讨论 "slice header"(切片头指针)，因为它们才是真正被存储在 slice 变量的东西。例如，当你调用一个将 slice 作为入参的函数时，比如说 [bytes.IndexRune](https://pkg.go.dev/bytes#IndexRune) 调用，这个 header 才是那个被传入函数的参数。在下面这个调用中：
```go
slashPos := bytes.IndexRune(slice, '/')
```
这个传入 `IndexRune` 的参数 `slice`， 实际上是一个 slice header。

slice header 里面还有一个数据成员，后面我们会讨论，但先让我们来看一下当你使用 slices 编程的时候，slice header 的存在意味着什么

#### 将 slices 传入函数

即使一个 slice 包含一个指针，但它本身仍旧是一个值(value)，理解这一点非常重要。掩藏在其表面之下的，是一个包含了一个指针，和长度(length)这两个数据成员的结构体(struct)的值，**而不是**指向结构体的指针(区别于 C/C++ 中数组的头指针，译者注)。

这个事实影响很大。

当我们在上一个例子中调用 `IndexRune` 的时候，它传入了一个 slice header 的副本。这个行为会产生很重要的后续结果。

思考以下这个简单的函数：
```go
func AddOneToEachElement(slice []byte) {
    for i := range slice {
        slice[i]++
    }
}
```
如它的函数名一样，它只会做一件事，迭代 slice 的所有下标，对其所有元素做自增操作。

试一试：
```go
func main() {
    slice := buffer[10:20]
    for i := 0; i < len(slice); i++ {
        slice[i] = byte(i)
    }
    fmt.Println("before", slice)
    AddOneToEachElement(slice)
    fmt.Println("after", slice)
}
```

即使 slice header 是以值的形式传入的，但 header 包含了一个指向 array 的指针，因此无论是原数组的 header，还是传入函数的 header 的副本，都描述的是同一个 array，所以，当函数返回的时候，原 slice 变量上相应的值也被修改了。

传入函数的变量的的确确是一个副本，如下例所示：
```go
func SubtractOneFromLength(slice []byte) []byte {
    slice = slice[0 : len(slice)-1]
    return slice
}

func main() {
    fmt.Println("Before: len(slice) =", len(slice))
    newSlice := SubtractOneFromLength(slice)
    fmt.Println("After:  len(slice) =", len(slice))
    fmt.Println("After:  len(newSlice) =", len(newSlice))
}
```
这里我们看到 slice 变量的 *内容* 可以被某个函数修改，但它的 *header* 不能。存储在 slice 中的长度没有被函数的调用修改，因为函数中传入的是 slice header 的副本，不是原来的 slice header。因此如果我们想要写一个修改 header 的函数，我们必须把它当作结果参数返回，正如我们在这里做的一样。slice 变量并没有被修改，但函数的返回值是有新的长度值的，它被存储在 `newSlice` 中。

#### 指向 slice 的指针：方法接收器(method receiver)

另一种能让函数修改 slice header 的方式是传入一个指向 slice header 的指针。下面的例子是实现了这种方式的之前例子的一个变体：
```go
func PtrSubtractOneFromLength(slicePtr *[]byte) {
    slice := *slicePtr
    *slicePtr = slice[0 : len(slice)-1]
}

func main() {
    fmt.Println("Before: len(slice) =", len(slice))
    PtrSubtractOneFromLength(&slice)
    fmt.Println("After:  len(slice) =", len(slice))
}
```
这个例子看上去不是一种好的处理方式，尤其是在处理额外的中间层(extra level of indirection)的时候(临时变量能有所帮助)，但有一种常见的情形，在这种情况下你会常见到传入指向 slice 指针的用法，那就是对想要修改 slice 的方法来说，我们很容易能想到可以传入指针接收器(pointer receiver)。

打个比方说，我们想让一个 slice 上的方法截断 slice 的最后一个斜杠，我们可以像这样写：
```go
type path []byte

func (p *path) TruncateAtFinalSlash() {
    i := bytes.LastIndex(*p, []byte("/"))
    if i >= 0 {
        *p = (*p)[0:i]
    }
}

func main() {
    pathName := path("/usr/bin/tso") // Conversion from string to path.
    pathName.TruncateAtFinalSlash()
    fmt.Printf("%s\n", pathName) // expect "/usr/bin"
}
```
运行上面的例子，代码可以按照要求生效，并更新调用点的 slice。

再比如说，如果我们要给 path 写一个方法，把 path 上的所有 ASCII 字母改成大写(不考虑非英语名称的情形)，那这个方法也可能是一个值，因为值接收器(value receiver)还是会指向同一个 array。
```go
type path []byte

func (p path) ToUpper() {
    for i, b := range p {
        if 'a' <= b && b <= 'z' {
            p[i] = b + 'A' - 'a'
        }
    }
}

func main() {
    pathName := path("/usr/bin/tso")
    pathName.ToUpper()
    fmt.Printf("%s\n", pathName) // expect /USR/BIN/TSO
}
```
这里，`ToUpper` 方法在 `for range` 结构里使用了两个变量以获得下标和 slice 元素，这种循环的形式避免了在循环体中多次使用 `p[i]`

#### (slice的)容量(Capacity)

下面的函数用一个 `element` 延展了其 `int[]` 的数据成员 `slice`：
```go
func Extend(slice []int, element int) []int {
    n := len(slice)
    slice = slice[0 : n+1]
    slice[n] = element
    return slice
}
```
现在运行
```go
func main() {
    var iBuffer [10]int
    slice := iBuffer[0:0]
    for i := 0; i < 20; i++ {
        slice = Extend(slice, i)
        fmt.Println(slice)
    }
}
```

slice 会逐渐增长直到...(代码中预期是 20，但实际没有，译者注)，但实际上它没有(增长到下标 10 时失败，译者注)。

现在是时候讨论 slice header 的第三个组成部分了：容量(capacity)。除了 array 指针和长度以外，slice header 同样存储了它的容量：
```go
type sliceHeader struct {
  Length        int
  Capacity      int
  ZerothElement *byte
}
```
`Capacity` 字段记录了底层 array 实际上占有的空间(应理解为底层 array 声明时分配的 fixed-size，译者注)，它是 `Length` 属性能够达到的最大值。尝试着将 slice 扩展到超出其容量的动作会超过 array 的上限并触发 panic。

例子中的 slice 创建自：
```go
slice := iBuffer[0:0]
```
其 header 实际上是：
```go
slice := sliceHeader{
  Length:         0,
  Capacity:       10,
  ZerothElement:  &iBuffer[0],
}
```

`Capacity` 等于：底层 array 的长度，减去 slice 中第 1 个元素在 array 中的下标(本例中为 0)。如果你要查询某个 slice 的容量，请使用内置的 `cap` 函数：
```go
if cap(slice) == len(slice) {
    fmt.Println("slice is full!")
}
```

#### 内存分配(Make)

那如果我们想扩展 slice，使其超过容量呢？你不能那么做！根据定义，容量是其扩张的上限，但你可以通过分配一个新的 array，把数据复制过去，然后修改 slice 来描述新的 array，来达到同样的效果。

我们开始分配。我们可以用内置的 `new` 函数来分配一个更大的 array，并对其 slice 化，但使用内置的 `make` 可能更简单。它会分配一个新的 array，并创建一个描述它的 slice header，一步解决。`make` 函数需要 3 个参数：slice 的类型、初始长度(length)、及其容量(capacity)，容量是 `make` 分配给 array 的存储 slice 数据的长度。下面的调用创建了一个长度为 10，还有 5 个元素空间的 slice：
```go
slice := make([]int, 10, 15)
fmt.Printf("len: %d, cap: %d\n", len(slice), cap(slice))
```

以下代码将这个 slice 容量翻倍，并保持长度不变：
```go
slice := make([]int, 10, 15)
fmt.Printf("len: %d, cap: %d\n", len(slice), cap(slice))
newSlice := make([]int, len(slice), 2*cap(slice))
for i := range slice {
    newSlice[i] = slice[i]
}
slice = newSlice
fmt.Printf("len: %d, cap: %d\n", len(slice), cap(slice))
```

上面这段代码运行以后，slice 就能有更多的扩展空间了。

创建 slice 的时候，通常情况是 length 和 capacity 是相同的，`make` 函数有一个针对这种情形的简写。length 参数默认和 capacity 相同，因此你可以把它们设置成相同的值，如：
```go
gophers := make([]Gopher, 10)
```
`gophers` 将 length 和 capacity 都设置成 10。

#### 复制(Copy)

在上一部分，我们将 slice 的 capacity 翻倍以后，我们写了一个循环把旧的数据复制到新的 slice 中。Go 有一个内置函数 `copy`，来简化这个操作。它的入参是 2 个 slice，它把右边的 slice 复制到左边的变量中，我们的例子可以用 `copy` 这样重写：
```go
newSlice := make([]int, len(slice), 2*cap(slice))
copy(newSlice, slice)
```

`copy` 函数很聪明，它会考虑到两个入参的 length，只会复制可以复制的那些。换句话说，它复制的元素个数是两个 slice length 的最小值。另外 `copy` 会返回一个 int 值，即它所复制的元素个数，尽管基本不值得确认。

`copy` 函数在源 slice 和目标 slice 有重合的时候也能正确处理，这意味着它也可以用来对 slice 中的整体或区块做偏移。下面这个展示了如何将某个元素插入 slice 的当中位置：
```go
// Insert inserts the value into the slice at the specified index,
// which must be in range.
// The slice must have room for the new element.
func Insert(slice []int, index, value int) []int {
    // Grow the slice by one element.
    slice = slice[0 : len(slice)+1]
    // Use copy to move the upper part of the slice out of the way and open a hole.
    copy(slice[index+1:], slice[index:])
    // Store the new value.
    slice[index] = value
    // Return the result.
    return slice
}
```

这个函数中还有几个点要注意。首先，毫无疑问，它必须返回更新后的 slice，因为其 length 改变了。第二，它使用了一种简写，表达：
```go
slice[i:]
```
其准确的涵义是：
```go
slice[i:len(slice)]
```
另外，尽管我们还没有使用这种技巧，slice 表达式的第一个参数也可以省略，表示默认为 0，因此
```go
slice[:]
```
表示 slice 自身，这在切片化(slicing) array 的数组很有用，这个表达式是实现"一个描述 array 中所有元素最简短的方式"：
```go
array[:]
```

现在先不管它，我们运行下 `Insert` 函数。
```go
slice := make([]int, 10, 20) // Note capacity > length: room to add element.
for i := range slice {
    slice[i] = i
}
fmt.Println(slice)
slice = Insert(slice, 5, 99)
fmt.Println(slice)
```

#### 追加(Append)：举例

让我们回到几节内容之前，我们写了一个 `Extend` 函数，它用一个元素来扩展 slice。虽然之前有 bug，因为如果 slice 容量太小的话，函数会崩溃。(我们的 `Insert` 例子也有同样的问题) 现在我们有精力来修复这个问题了，我们来实现一个 int 类型 slice 的、且更健壮的 `Extend` 函数。
```go
func Extend(slice []int, element int) []int {
    n := len(slice)
    if n == cap(slice) {
        // Slice is full; must grow.
        // We double its size and add 1, so if the size is zero we still grow.
        newSlice := make([]int, len(slice), 2*len(slice)+1)
        copy(newSlice, slice)
        slice = newSlice
    }
    slice = slice[0 : n+1]
    slice[n] = element
    return slice
}
```

这里返回 slice 特别重要，因为当重新分配内存的时候，作为结果的 slice 描述了一个完全不同的 array。以下一小块代码展示了当 slice 被填满的时候会发生什么：
```go
slice := make([]int, 0, 5)
for i := 0; i < 10; i++ {
    slice = Extend(slice, i)
    fmt.Printf("len=%d cap=%d slice=%v\n", len(slice), cap(slice), slice)
    fmt.Println("address of 0th element:", &slice[0])
}
```

注意当初始数组的 5 个元素全部填满之后重新分配的操作，slice 的容量和第 0 个元素的内存地址都被重新分配了。

有了健壮的 `Extend` 函数作为导引，我们写一个更好的函数，它能让我们用多个元素来扩展 slice。为了实现这个目标，我们在函数调用的时候，使用 Go 的能力把一个函数参数的列表转换成一个 slice。其实就是利用 Go 的可变函数设施(variadic function facility)。

我们把这个函数叫作`Append`。第一个版本呢，我们只能重复地调用`Extend`函数，因此这种可变函数的机制非常清晰。`Append`的函数签名为：
```go
func Append(slice []int, items ...int) []int
```

`Append`接收一个 slice 参数，后面可能还有 0 个或者更多的整数个参数。这些参数是`Append`的实现会用到的 int 的 slice，如你所见：
```go
// Append appends the items to the slice.
// First version: just loop calling Extend.
func Append(slice []int, items ...int) []int {
    for _, item := range items {
        slice = Extend(slice, item)
    }
    return slice
}
```

注意`for range`循环迭代的是`items`参数，隐含类型是 `[]int`。

运行下面的代码：
```go
slice := []int{0, 1, 2, 3, 4}
fmt.Println(slice)
slice = Append(slice, 5, 6, 7, 8)
fmt.Println(slice)
```

本例中另一种新技术是通过复合字面量(composite literal)，在花括号中包含了 slice 的元素，来初始化 slice：
```go
slice := []int{0, 1, 2, 3, 4}
```

`Append`函数因为另一个原因也很有趣，我们不只可以 append 元素，我们也可以通过使用 `...` 记号来"引爆"另一个 slice 中的元素，以 append 另一个完整的 slice：
```go
slice1 := []int{0, 1, 2, 3, 4}
slice2 := []int{55, 66, 77}
fmt.Println(slice1)
slice1 = Append(slice1, slice2...) // The '...' is essential!
fmt.Println(slice1)
```

当然，我们也可以基于`Extend`的实现，分配不超过一次，使得`Append`的效率更高：
```go
// Append appends the elements to the slice.
// Efficient version.
func Append(slice []int, elements ...int) []int {
    n := len(slice)
    total := len(slice) + len(elements)
    if total > cap(slice) {
        // Reallocate. Grow to 1.5 times the new size, so we can still grow.
        newSize := total*3/2 + 1
        newSlice := make([]int, total, newSize)
        copy(newSlice, slice)
        slice = newSlice
    }
    slice = slice[:total]
    copy(slice[n:], elements)
    return slice
}
```

注意这里我们用了两次`copy`函数，一次把 slice 中的数据转移到新分配的内存中，之后把需要追加的元素放在旧数据的最后。

#### Append：内置函数

现在我们可以来探讨设计内置函数`append`的动机了，它做的事情实际和我们`Append`例子中做的事情一模一样，有着同样的效率，只是它适用于任何 slice 类型。

Go 的一个弱项是任何泛型操作必须在运行时才能提供，也许未来某一天会有所改变，但就目前来说，为了能更简单地使用 slice，Go 提供了内置的泛型 `append` 函数，它的工作原理和我们 int slice 的版本一样，只是适用用所有类型。

记住，由于 slice header 总是会在调用`append`时更新，返回的 slice 需要存下来。实际上，编译器不会让在不存储返回结果的情形下调用 append。

以下是一些单行方式的混合打印语句：
```go
// Create a couple of starter slices.
slice := []int{1, 2, 3}
slice2 := []int{55, 66, 77}
fmt.Println("Start slice: ", slice)
fmt.Println("Start slice2:", slice2)

// Add an item to a slice.
slice = append(slice, 4)
fmt.Println("Add one item:", slice)

// Add one slice to another.
slice = append(slice, slice2...)
fmt.Println("Add one slice:", slice)

// Make a copy of a slice (of int).
slice3 := append([]int(nil), slice...)
fmt.Println("Copy a slice:", slice3)

// Copy a slice to the end of itself.
fmt.Println("Before append to self:", slice)
slice = append(slice, slice...)
fmt.Println("After append to self:", slice)
```

值得花点时间思考一下最后一行例子(one-liners)以理解 slice 的设计是如何让这个简单的调用能正常工作的。

社区的[“Slice Tricks” Wiki 页面](https://github.com/golang/go/wiki/SliceTricks)还有很多关于`append`、`copy`以及其他使用 slice 的例子。

#### Nil

此外，用我们新学到的知识，我们来看一看`nil` slice 代表什么涵义。一个自然的想法是，它是 slice header 的零值(zero value):
```go
sliceHeader{
    Length:        0,
    Capacity:      0,
    ZerothElement: nil,
}
```
或者是
```go
sliceHeader{}
```
关于的细节是元素的指针也是`nil`。由
```go
array[0:0]
```
创建的 slice 长度为 0 (有可能 capacity 也为 0)，但它的指针不是 0，因此它不是一个 `nil` slice。

应该要明确的是，一个空 slice 是可以扩展的(假设其容量非 0)，但`nil` slice 没有 array 来存放值，并且也无法扩展到能够存放一个元素的程度。

也就是说，一个`nil` slice 在功能上和 0 长度的 slice 是等价的，即便它不指向任何东西。它的长度为 0，可以被 append，通过分配内存的方式。举个例子，看一看上面的单行代码(one-liners)中，有一个例子通过 append nil slice 复制了一个 slice。

#### 字符串

这一节是关于在 slice 的上下文下，Go 中的字符串的一些知识。

字符串实际上很简单，它们只是**只读**的 **bytes 类型**的 slice，当然还有一些来自语言的额外句法支持。

由于它们是只读的，因此没必要赋予它们容量这个属性(不能写就无法扩展嘛)。但并不影响你在多数场景下，可以像处理只读的 bytes 类型的 slice 那样来处理它们。

首先，我们可以用下标访问单个 byte：
```go
slash := "/usr/ken"[0] // yields the byte value '/'.
```
我们可以对某个 string 进行切片处理(slice)以获得子串：
```go
usr := "/usr/ken"[0:4] // yields the string "/usr"
```
当我们 slice 时，这种场景背后具体会发生什么应该很显然了。

我们也可以使用通常的 bytes 类型的 slice，并用一个简单的转换构造对应 string 的值：
```go
str := string(slice)
```
反之亦然
```go
slice := []byte(usr)
```
字符串下的底层 array 是看不见的，除了通过字符串以外，没有方式能够访问其内容，这意味当我们做任何这些转换的时候，一定会生成 array 的副本。当然，Go 会处理这些，你不用管。在任一转换之后，对 bytes slice 底层 array 的修改不会影响对应的 string。(因为 bytes slice -> string 时会生成 bytes slice 底层 array 的 copy，反之会生成 string 底层 array 的 copy，译者注)

这种字符串类 slice (slice-like) 的设计的一个重要结果在于，创建子串时效率很高，要做的所有操作只是创建一个两个词的 string header。由于字符串是只读的，源字符串和 slice 操作产生的结果字符串可以安全地共享同一个 array。

历史备注：字符串最早期的实现总是会分配的，但随着 slice 加入到了语言里，它们提供了一个更高效的字符串处理方式，部分基线检测中看到了巨大的速度提升的结果。

当然，字符串还有更多的相关知识，以及一篇[独立的博文](https://go.dev/blog/strings)，包含了字符串中更为深度的内容。


#### 结论

明白了 slice 是如何工作的，就能够帮助理解它们是如何实现的。slice header 是和 slice 变量有关联的数据结构，描述了独立分配的 array 的部分。当我们传递 slice 值的时候，header 值是会被复制的，但是其指向的 array 是共享的。

一旦你喜欢上了 slice 工作的方式，slice 不仅会变得易用，而且还会变得强大，并能够表达多种场景，特别是在 `copy` 和 `append` 内置函数的帮助下。

#### 其他阅读材料

略
