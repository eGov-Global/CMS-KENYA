// REASSIGNTOGRO (Bonga: PENDINGATLME -> PENDINGFORASSIGNMENT, granted to
// PGR_LME) sends a complaint from the last-mile officer back to the GRO pool,
// to be assigned again like a newly filed one. So the Take Action popup has no
// employee to pick, the comment is optional like the attachments, and the
// department stamped by the earlier ASSIGN is dropped: pgr-services then puts
// back the complaint type's own department, exactly as on create. Only this
// action works this way; every other one keeps its popup and rules.
export const RETURN_TO_GRO_ACTION = "REASSIGNTOGRO";

export const isReturnToGroAction = (action) => action === RETURN_TO_GRO_ACTION;

// additionalDetail must already be parsed (it arrives as an object or a JSON
// string). An empty comment is left out so the timeline doesn't render an
// empty "Comments" line.
export const buildReturnToGroRequest = (service, additionalDetail, comments, documents) => {
  const withoutDepartment = { ...(additionalDetail || {}) };
  delete withoutDepartment.department;
  const comment = String(comments || "").trim();
  return {
    service: { ...service, additionalDetail: withoutDepartment },
    workflow: {
      action: RETURN_TO_GRO_ACTION,
      assignes: null,
      hrmsAssignes: null,
      ...(comment ? { comments: comment } : {}),
      ...(Array.isArray(documents) && documents.length > 0 ? { verificationDocuments: documents } : {}),
    },
  };
};
