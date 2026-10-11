/**
 * A call or message is stored once per phone (`message/<id>/<owner>`), but it is one communication: either
 * copy proves the same thing. Compare evidence through this so the phone you read it on never matters.
 */
export function evidenceKey(evidenceId: string) {
  return evidenceId.replace(/^(message|call)\/([^/]+)\/[^/]+$/, "$1/$2");
}

export function sameEvidence(a: string, b: string) {
  return evidenceKey(a) === evidenceKey(b);
}
