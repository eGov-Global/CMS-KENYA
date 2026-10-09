// Stand-in for @egovernments/digit-ui-components-v2 in node tests: the landing
// page only uses its `cn` class-name joiner.
module.exports = { cn: (...parts) => parts.flat().filter(Boolean).join(" ") };
