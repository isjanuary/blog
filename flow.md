```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```

```flow
  st=>start: Start
  op=>operation: Your Operation
  cond=>condition: Yes or No?
  e=>end
  st->op->cond
  cond(yes)->e
  cond(no)->op
```