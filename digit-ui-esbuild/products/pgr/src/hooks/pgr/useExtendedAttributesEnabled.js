// Does this tenant run the per-category "extended attributes" feature
// (Mozambique IGE/IGSAE: complainant/witness fields, confidentiality)?
//
// The signal is the one both create forms already use: a tenant is in the
// feature iff RAINMAKER-PGR.ComplaintRelatedToMap has rows for its state
// tenant. The query is byte-identical to theirs — same master, same select,
// same schemaCode — so on a session that has opened a create form this is a
// cache hit (cacheTime: Infinity), not a new request.
//
// Default-safe polarity: `enabled` is false until the map has loaded and is
// non-empty. A tenant outside the feature (Kenya/Bomet) therefore never shows
// the sections gated on it, even for a frame; a tenant inside it shows them
// once the (cached) map lands.
const useExtendedAttributesEnabled = (tenantId) => {
  const stateTenant = (tenantId || "").split(".")[0] || tenantId;
  const { data: relatedToMap, isLoading } = Digit.Hooks.useCustomMDMS(
    stateTenant,
    "RAINMAKER-PGR",
    [{ name: "ComplaintRelatedToMap" }],
    { cacheTime: Infinity, select: (raw) => raw?.["RAINMAKER-PGR"]?.ComplaintRelatedToMap || [] },
    { schemaCode: "PGR_COMPLAINT_RELATED_TO_MAP", tenantId: stateTenant }
  );
  return { enabled: Array.isArray(relatedToMap) && relatedToMap.length > 0, isLoading };
};

export default useExtendedAttributesEnabled;
