# Recorded cases

Every AI-generated case worth keeping (passing or failing) is saved here as a permanent regression test.
`convex/generation/replay.test.ts` reruns all code stages and checks on each file and compares the problems
found with a snapshot.

Save a job from the generation tester:

```sh
npx convex run dev/tester:exportJob '{"jobId":"<job id>"}' > convex/fixtures/recorded/<short-name>.json
```

Then run `npx vitest run convex/generation/replay.test.ts -u` once to record its snapshot, and check the
snapshot diff makes sense. Later changes to code stages or checks show up as snapshot differences.
