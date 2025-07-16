---
title: "Writeup on Graph Algorithms"
description: WIA2005
date: 2025-07-15T23:37:48Z
image: 
tags:
    - Algorithm
categories:
    - School
comments: false
---

1. In graph theory, there are four major types of problems:
	1. Searching: We want to find a node, n in the tree
	2. Minimum spanning tree: We want to find a way to connect all nodes in the cheapest way possible.
	3. Single source shortest path: We want to find the shortest path from a source node, u to every other node, v in the graph.
	4. All pairs shortest path: We want to find the shortest path from all nodes to every other nodes in the graph
## Searching algorithms
1. There are two important search algorithms:
	1. Depth-first search (DFS)
	2. Breadth-first search (BFS)
2. General differences:
	1. DFS uses stack while BFS uses queue
	2. DFS results in a "taller" tree while BFS results in a tree with more branches
3. DFS Pseudocode
```
DFS(G,s)
V = {}
DFS-AUX(G,s,V)

DFS-AUX(G,u,V)
if u is in V
	return
	
process(u) // print it, add it to a sum etc
V = V U {u}
for each vertex v that is neighbour of u
	if v is not in V
		DFS-AUX(G,v,V)
```
4. BFS Pseudocode
```
BFS(G,s)
V = {s}
Create queue Q
ENQUEUE(Q,s)

while Q is not empty
	u = DEQUEUE(Q)
	process(u)  // print it, add it to a sum etc
	for each vertex v that is a neighbour of u
		if v is not in V
			V = V U {v}
			ENQUEUE(Q,v)
```
## Minimum spanning tree 
1. Minimum spanning tree: Connected and acyclic graph in which the total weight of edges is the smallest
2. Two ways to create MST:
	1. Prim's algorithm
		1. Choose vertex
		2. Maintain one MST during building process
	2. Kruskal's algorithm
		1. Choose edge
		2. Maintain one or more MST during building process
3. Prim's Algorithm Pseudocode
```
PRIM(G,s)
// initialise key and previous node
for each vertex v in G.V:
	v.key = INF
	v.previous = NIL
s.key=0

V = G.V
while V is not empty:
	u = EXTRACT-MIN(V) // get node with lowest weight
	for each vertex v that is neighbour of u
		// adjust the key of all nodes
		if v is in V and v.key > w(u,v):
				v.key = w(u,v)
				v.previous = u
```
4. Kruskal's Algorithm Pseudocode
```
KRUSKAL(G)
for each vertex v in G.V:
	MAKE-SET(v) // each vertex is its own tree
Sort G.E in ascending order of weight // get edge with lowest weight each time
S = {}
for each edge (u,v) in G.E: 
	if GET-SET(u) != GET-SET(v): // prevents merge of nodes from same tree
		UNION(u,v) // merge two trees
		S = S U {(u,v)} // add edge to output
return S
```
5. Both Prim and Kruskal have time complexity of `O(ElogV)`
## Single source shortest Path
1. Objective is to find shortest path from current node, s to all other nodes
2. Two algorithms are available:
	1. Dijkstra's
		1. Cannot handle negative weights
		2. Better time complexity for positive weights than Bellman-Ford
	2. Bellman-Ford
		1. Can handle negative weights
3. Both do not work if there exists a negative cycle
4. Dijkstra's algorithm pseudocode
```
DIJKSTRA(G,s,w)
INITIALISE-SINGLE-SOURCE(G,s)
V = G.V
while V is not empty:
	u = EXTRACT-MIN(V) // Get the vertex with smallest weight every time
	for each vertex v that is neighbour of u:
		RELAX(u,v,w)
```
5. Bellman-Ford algorithm Pseudocode
```
BELLMAN-FORD(G,s,w)
INTIALISE-SINGLE-SOURCE(G,s)
n = |G.V|
for i in 1 to n-1
	for each edge(u,v) in G.E
		RELAX(u,v,w)
for each edge(u,v) in G.E
	if v.key > u.key+w(u,v)
		return FALSE // If negative cycle exist, the result is wrong
return TRUE
```
6. Helper algorithms
```
// Initialize all vertex to have nodes with impossible distance and no parent node, except source node 
INTIIALISE-SINGLE-SOURCE(G,s)
for each vertex u in G.V
	u.key = INF
	u.previous = NIL
s.key = 0

// Adjust the key of each node IF there is a better path to the node
RELAX(u,v,w)
if v.key > u.key+w(u,v)
	v.key = u.key+w(u,v)
	v.previous = u
```
7. Time complexity of Dijkstra 
	1. Without max-heap: `O(V^2)`
	2. With max-heap: `O(ElogV)`
8. Time complexity of Bellman-Ford is `O(VE)`
## All Pairs Shortest Path
1. Objective is for each pair of vertex, u and v, of the graph, find the shortest path between these two nodes
2. Two algorithms:
	1. Johnson's:
		1. Complex as heck, but better time complexity
	2. Floyd-Warshall
		1. Simple, uses matrices
3. Johnson's algorithm high level overview
	1. Add a new vertex to the graph and add edge to each existing vertex on the graph
	2. Apply Bellman-Ford algorithm and normalize the graph to remove all negative-weighted edges
	3. Remove the extra vertex in step 1 and apply Dijkstra's on all original vertices.
4. Floyd-Warshall algorithm pseudocode
```
FLOYD-WARSHALL(G,w)
n = |G.V| 
Create a matrix nxn, D(0)
D = G
for i in 1 to n
	for j in 1 to n
		for k in 1 to n
			Create a new nxn matrix, D(i)
			D(i)[j][k] = MIN(D(i-1)[j][k], D(i-1)[j][i]+D(i-1)[i][k])
return D(n)
```
5. Floyd-Warshall time complexity is `O(V^3)`
6. Johnson's algorithm time complexity is `O(V^2 log V + VE)`
