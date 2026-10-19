// REASSIGNTOGRO on Bonga (PENDINGATLME -> PENDINGFORASSIGNMENT, PGR_LME): the
// complaint goes back to the GRO pool like a new one — nobody picked, the routed
// department dropped (pgr-services restores the type's own), comment optional.
import test from "node:test";
import assert from "node:assert/strict";
import { buildReturnToGroRequest, isReturnToGroAction, RETURN_TO_GRO_ACTION } from "../products/pgr/src/utils/reassignToGro.js";

const SERVICE = { tenantId: "nb", serviceRequestId: "PG-PGR-2026-10-12-000001", serviceCode: "WaterLeak", applicationStatus: "PENDINGATLME" };
const ROUTED = { department: "DEPT_WATER", serviceName: "Water leak", consents: ["TERMS"], consentsAcceptedAt: 1791796849726 };

test("only REASSIGNTOGRO returns a complaint to the GRO pool", () => {
  assert.equal(RETURN_TO_GRO_ACTION, "REASSIGNTOGRO");
  assert.equal(isReturnToGroAction("REASSIGNTOGRO"), true);
  for (const action of ["ASSIGN", "REASSIGN", "RESOLVE", "REJECT", "ESCALATE", "WITHDRAW", "REOPEN", "RATE", undefined]) {
    assert.equal(isReturnToGroAction(action), false, String(action));
  }
});

test("the routed department is dropped and every other detail is kept", () => {
  const { service } = buildReturnToGroRequest(SERVICE, ROUTED, "Wrong department", []);
  assert.equal("department" in service.additionalDetail, false);
  assert.deepEqual(service.additionalDetail, { serviceName: "Water leak", consents: ["TERMS"], consentsAcceptedAt: 1791796849726 });
  assert.equal(service.serviceRequestId, SERVICE.serviceRequestId);
  assert.equal(ROUTED.department, "DEPT_WATER", "the complaint object it was built from is not mutated");
});

test("nobody is assigned: back to the GRO pool", () => {
  const { workflow } = buildReturnToGroRequest(SERVICE, ROUTED, "x", []);
  assert.equal(workflow.action, "REASSIGNTOGRO");
  assert.equal(workflow.assignes, null);
  assert.equal(workflow.hrmsAssignes, null);
});

test("the comment is optional: an empty one is left out, a real one is trimmed", () => {
  for (const empty of [undefined, null, "", "   "]) {
    assert.equal("comments" in buildReturnToGroRequest(SERVICE, ROUTED, empty, []).workflow, false, JSON.stringify(empty));
  }
  assert.equal(buildReturnToGroRequest(SERVICE, ROUTED, "  Not in our ward  ", []).workflow.comments, "Not in our ward");
});

test("attachments are optional: sent only when some were added", () => {
  assert.equal("verificationDocuments" in buildReturnToGroRequest(SERVICE, ROUTED, "", []).workflow, false);
  assert.equal("verificationDocuments" in buildReturnToGroRequest(SERVICE, ROUTED, "", undefined).workflow, false);
  const docs = [{ documentType: "PHOTO", fileStoreId: "fs-1" }];
  assert.deepEqual(buildReturnToGroRequest(SERVICE, ROUTED, "", docs).workflow.verificationDocuments, docs);
});

test("a complaint with no additionalDetail still builds a valid request", () => {
  const { service } = buildReturnToGroRequest(SERVICE, undefined, "", []);
  assert.deepEqual(service.additionalDetail, {});
});
