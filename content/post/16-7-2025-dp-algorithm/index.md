---
title: "Writeup on Dynamic Programming Algorithms"
description: WIA2005
date: 2025-07-15T23:46:39Z
image: 
tags:
    - Algorithm
categories:
    - School
comments: false
---

1. Dynamic programming is programming paradigm that takes advantage of overlapping subprograms. It increases efficiency by answering the subproblems once and keeping the answers to overlapping subprograms.
2. There are two approaches of dynamic programming
	1. Memoization: We store the answers of overlapping subprograms as we solve them.
	2. Tabulation: We calculates the answers of the overlapping subprograms first.
3. There are a few problems that can be solved with DP:
	1. 0-1 Knapsack Problem
	2. Rod-cutting Problem
	3. Fibonacci Series
## Fibonacci Series
1. This is a good problem to showcase the efficiency of dynamic programming
2. To solve this series naively, we use this
```
FIB(n)
if n<=1
	return n
return FIB(n-1)+FIB(n-2)
```
3. Recursive tree of naive algorithm: ![[Pasted image 20250709205728.png]]
	1. As you can see many calculations are repeated. This is the so called "overlapping subproblem"
	2. For example, `FIB(2)` is repeated 3 times
4. We can improve efficiency by storing the results of `FIB(X)` ![[Pasted image 20250709205942.png]]
5. This method is called the memoization method in dynamic programming
```
FIB-MEMO(n)
Create an array S[0..n]
for i in 1 to n
	S[i] = -1
return FIB-AUX(n,S)

FIB-AUX(n,S)
if S[n] != -1:
	return S[n] // if S[n] is memorized
if n<=1
	return n
S[n] = FIB-AUX(n-1,S) + FIB-AUX(n-2,S) // memorize the output of FIB(n)
return S[n]
```
6. The tabulation approach is slightly different. In this approach, we will precompute all the answers to subproblems
```
FIB(n)
Create an array A[0..n]
A[0] = 0
A[1] = 1
for i in 2 to n
	A[i] = A[i-1] + A[i-2]
return A[n]
```
Visualization

| i      | 0   | 1   | 2   | 3   | 4   | 5   | 6   | ... | n   |
| ------ | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FIB(i) | 0   | 1   | 1   | 2   | 3   | 5   | 8   | ….  |     |
7. The naive approach to Fibonacci numbers has a time complexity of `O(2^n)` while the dynamic programming approach to Fibonacci numbers has a time complexity of `O(n)`
## Rod-Cutting Problem
1. In this problem, we want to maximise the profit from a given length of rod. This is because the length of the rod is not proportional to the profit of the rod.
2. Example: Say we have a Profit array of `P = [3,5,1,9]`, where the profit of 1 unit length of rod is `P[1] = 3` and so on. The length of the rod right now is 4 units. What is the best way to chop and sell this rod?
3. The trick to solve this is to recursively find the maximum profit for rod length 1,2,3 and 4.
```
M[4] = MAX(
	P[4]+M[0], // no cut
	P[3]+M[1], // 3 unit + best cut for 1 unit
	P[2]+M[2], // 2 unit + best cut for 2 unit
	P[1]+M[3] // 1 unit + best cut for 3 unit
	)
```
To find the best cut of length 3,
```
M[3] = MAX(
	P[3]+M[0], // no cut
	P[2]+M[1], // 3 unit + best cut for 1 unit
	P[1]+M[2], // 2 unit + best cut for 2 unit
	)
```
And so on.
4. The tabulation algorithm (n is the length of rod while P is the profit for each length of rod)
```
ROD(n,P)
Create an array M[0..n]
M[0] = 0
for i in 1 to n
	q = - INF
	for j in 1 to i
		q = MAX(q, P[j]+ M[i-j])
	M[i] = q
return M[n]
```
5. The memoization algorithm
```
ROD(n,P)
Create an array M[0..n]
for i in 0 to n
	M[i] = -INF
ROD-AUX(n,P,M)

ROD-AUX(i,P,M)
if M[i] != -INF
	return M[i]
if i == 0
	M[i] = 0
	return M[i]
q = -INF
for j in 1 to i
	q = MAX(q, P[j]+ROD-AUX(i-j,P,M))
M[i] = q
return M[i]
```
## 0-1 Knapsack Problem
1. In this problem, we have n indivisible objects. We can only choose m objects out of n into our knapsack. We can only carry a max weight, w. Each object has a certain profit, `P[i]`. How do we pick these objects such that our profit is maximized?
2. The naive approach is to test all possibilities. 
	1. An object can be either in or outside the knapsack. (0 or 1)
	2. Thus, there is 2^n ways to choose objects.
	3. Find the profit of all the permutations. Reject the permutation that cause the knapsack to become overweight.
3. The dynamic programming approach will stop the search at the maximum weight and avoid recalculating what is the highest profit at a certain weight value. (Kinda bad explanation, lul)
4. The DP algorithm (Tabulation approach)
```
KNAPSACK(P,W,max)
n = W.length
Create a 2d array, M[0..n][0..max]
for i in 0 to max
	M[0][i] = 0 // nothing has a profit of zero
for i in 1 to n 
	for j in 0 to max
		if j >= W[i]
			M[i][j] = MIN(M[i-1][j], M[i-1][j-W[i]]+P[i]) // ok, basically check if the previous set of objects or previous set of objects and the profit of current object is higher
		else
			M[i][j] = M[i-1][j]
return M[n][max]
```
5. Example
P = {1,2,5,6}  
W = {2,3,4,5}  
Max weight = 8

| **P** | **W** | **i** | **0** | **1** | **2** | **3** | **4** | **5** | **6** | **7** |     8 |
| ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: |
|     0 |     0 | i = 0 |     0 |     0 |     0 |     0 |     0 |     0 |     0 |     0 |     0 |
|     1 |     2 | i = 1 |     0 |     0 |     1 |     1 |     1 |     1 |     1 |     1 |     1 |
|     2 |     3 | i = 2 |     0 |     0 |     1 |     ==2== |     2 |     3 |     3 |     3 |     3 |
|     5 |     4 | i = 3 |     0 |     0 |     1 |     ==2== |     5 |     5 |     6 |     7 |     7 |
|     6 |     5 | i = 4 |     0 |     0 |     1 |     ==2== |     5 |     6 |     6 |     7 | ==8== |
Max-profit = 8

To backtrack which object is in the set,
Notice that `M[3][8]` is 7 != 8. Thus, Item 4 must be in this set.
Subtract `P[4]` from 8. We get `8-6=2`.
Follow the column with value in 2
Notice that `M[1][3]` is 1 != 2. Thus, Item 2 must be in this set.

Set of item with maximum profit = {2,4}