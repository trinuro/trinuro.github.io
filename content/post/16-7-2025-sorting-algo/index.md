---
title: "Writeups on Sorting Algorithms"
description: WIA2005
date: 2025-07-15T23:59:30Z
image: 
tags:
    - Algorithm
categories:
    - School
comments: false
---

## Merge Sort
1. This algorithm is interesting as it has a worst and average case of `O(nlogn)`
2. However, it is not in-place (Requires extra memory)
3. It is stable too. (The relative position of two elements of the same value is the same before and after sorting.)
```
MERGE-SORT(A,p,q)
m = floor((p+q)/2)
MERGE-SORT(A,p,m-1)
MERGE-SORT(A,m,q)
MERGE(A,p,q,m)

MERGE(A,p,q,m)
n1 = m-p
n2 = q-m+1

Create an array, L[1..n1]
Create an array, R[1..n2]

L[1..n1] = A[p..m-1]
R[1..n2] = A[m..q]

j = 0
k = 0
for i in p to q
	if L[j] <= R[k]
		A[i] = L[j]
		j = j+1
	else 
		A[i] = R[k]
		k = k+1
```

## Quick Sort
1. Good all-purpose sorting algorithm
2. In-place (Sorting is done without extra memory)
3. Not stable
4. It has an average case of `O(nlogn)` and a worst case of `O(n)`
5. The algorithm
```
QUICK-SORT(A,p,q)
m = PARTITION(A,p,q)
QUICK-SORT(A,p,m-1)
QUICK-SORT(A,m,q)

PARTITION(A,p,q)
u = A[q] // get the last element as pivot
k = 0
for i in p to q-1
	if A[i] < u // elements smaller than pivot will be to the left of pivot
		k = k+1
		swap A[i] and A[k]
Swap A[i] and A[k+1] // pivot will be between elements smaller than it and elements larger than it
return k+1 // position of pivot
```
6. In order to reduce the possibility of the worst case from happening, we should randomly choose the pivot.
## Counting sort
1. The algo
```
counting-sort(A,B,k)
let C[1..k] be a new list
for i = 1 to k
	C[i] = 0
for j = 1 to A.length
	C[A[j]] = C[A[j]] + 1
for i = 1 to k
	C[i] = C[i]+C[i-1]
for j = A.length downto 1
	B[C[A[j]]] = A[j]
	C[A[j]] = C[A[j]] -1
```
2. Time complexity is `O(n+k)`
3. It is very efficient if the range of elements is small and known
4. Counting sort is stable.
## Radix Sort
1. The algo
```
radix-sort(A,d)
for i = 1 to d
	use a stable sort to sort array[A] on digit i
```
2. Time complexity is `O(n*k)` where n is the number of elements and k is the number of radices.
3. It is very efficient to sort integers with similar number of integers
## Bucket Sort
```
bucket-sort(A)
n = A.length
let B [0..n-1] be a new array
for i = 0  to n-1
	make B[i] an empty list
for i = 1 to n
	insert A[i] into list B[|_n*A[i]_|]
concatenate the lists B[0], B[1]...B[n-1] together in order
```
Time complexity is `theta(n)`/`O(n+k)` where n is the number of elements and k is the number of buckets.

## Shell Sort
1. Algorithm
```
gaps = [x,y,z...]

for each (G in gaps)
	create sub-arrays with elements having gap as G
	for each (S in sub-arrays)
		insertion_sort(s)
	merge all sub arrays
```
- gaps usually divides by 2 every iteration
2. Does not have a fixed time complexity. 
3. Apparently, it is good for sorting with limited memory?