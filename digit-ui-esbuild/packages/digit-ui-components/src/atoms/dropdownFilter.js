// Text filter for the Dropdown atom's option list.
//
// Flat lists: an option stays when its label contains the typed text.
// Nested lists (options with `options` children): a group stays when its
// header matches (all children kept) or when any child matches (only those
// children kept). Matching headers alone made the children unsearchable — a
// department-grouped staff list could not be searched by a person's name.

export const filterDropdownOptions = (options, filterVal, optionKey, t = (x) => x) => {
  if (!Array.isArray(options)) return [];
  const needle = (filterVal || "").toUpperCase();
  const matches = (option) => {
    const label = t(option?.[optionKey]);
    return typeof label === "string" && label.toUpperCase().indexOf(needle) > -1;
  };
  if (!needle) return options;
  return options
    .filter((option) => matches(option) || (Array.isArray(option?.options) && option.options.some(matches)))
    .map((option) =>
      matches(option) || !Array.isArray(option?.options) ? option : { ...option, options: option.options.filter(matches) }
    );
};

export default filterDropdownOptions;
