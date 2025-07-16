---
title: "Writeup on Hashing Algorithms"
description: WIA2005
date: 2025-07-15T23:57:16Z
image:
tags:
    - Algorithm
categories:
    - School
comments: false
---

1. Hash tables are interesting because they have an average time complexity of `O(1)` for most operations. In order words, for most cases, we can retrieve and insert data in the constant time.
2. To insert data, we will convert the key into hash, then insert the key into the table. 
3. Table\[hash(key)] = key
4. Load factor is the ratio of the number of elements to number of slots in the table. The higher this ratio, the higher the probability of collision (Two elements have the same hash).
5. Hash table operations (insert, retrieval) time complexity:
	1. Average case: `O(1)`
	2. Worst case: `O(n)`
	3. For hashing with chaining, `O(1+alpha)`, where Alpha is the load factor
## Types of Hashes
1. Modular hashes: `H(k) = k mod q`
2. Multiplication hashes: `H(k) = floor(q*(n*k mod 1))`. Best way I can explain this is we multiply k by a fraction, n and gets the fraction (numbers after decimal point).. Then, we multiply it by a certain number and get a whole number.
3. Cryptographic hashes: RSA etc
4. Universal hashing: Create a set of hashes. Choose one to use randomly each time we need a hash.
## Hash collision Handling Methods
1. Hash collisions refers to the situation where two data has the same hash.
2. There are two ways to handle this
	1. Chaining: Each "slot" in the table is a linked list. Append the colliding elements to the linked list in table\[hash]
	2. Open addressing: Find another spot in the table to insert the second element
3. We can see some pros and cons immediately:
	1. Chaining:
		1. Pros: Handles collisions very well. Works even when number of elements is more than number of slots. Also should be used when we do not know how many keys will be inserted into the hash table
		2. Cons: More memory needed (Linked list needs to store the memory address of next node)
	2. Open addressing:
		1. Pros: Only one element per slot. More memory efficient.
### Probing
1. In open addressing when collisions occur, we need to search for the next spot. This searching process is called probing.
2. There are 3 probing methods available:
	1. Linear probe: Basically, add 1 to the original hash. For example, if the first hash is 7, next hash is 8, 9 etc
	2. Quadratic probe: Add `c1*i+c2*i^2` to the original hash. For example, if the first hash is 4, next hash is 5, 8, 13 etc. (4+i^2)
	3. Double hashing: Formula is `H(k) = h1(k)+i*h2(k) % m`. We need a second auxiliary hash to calculate the next probe sequence. 
3. Double hashing is better than linear and quadratic probe because it provides a unique probe sequence for each colliding key. 
	1. Just imagine, if 5 keys collide using linear/quadratic probing, the fifth key has to probe 5 times before reaching a place to put itself in
4. However, there are two important criteria when using double hashing:
	1. Result of second hash cannot be zero. You will be forever stuck!
	2. Result of hash (`H(k)`) must be co-prime to the number of slots in the table
### Resizing hash table
1. You might be wondering, chaining seems so much better. You may be right, if not for resizing hash table.
2. Process of resizing hash table 
	1. Double (more or less) the size of the hash table
	2. Recalculate the keys of each element in the table
	3. Insert the elements in the table
3. You should resize the table when load factor is too high to maintain optimal performance.
### Personal Opinion
1. The best hash table in my opinion is hash table with open addressing and double hashing. The hash used is universal hashing. Hash table resize occurs when load factor exceeds 0.7.
2. Universal hashing means that we do not use the same hash every time. We create a collection of hashes and choose 1 to use randomly every time.
3. Double hashing ensures two colliding keys have different probe sequence.