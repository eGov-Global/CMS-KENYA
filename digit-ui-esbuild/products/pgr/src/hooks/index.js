import utils from "../utils";
import useProjectSearch from "./project/useProjectSearch";
import usePGRInitialization from "./project/usePGRInitialization";
import useFetchBoundaries from "./boundary/useFetchBoundaries";
import useCreateComplaint from "./pgr/useCreateComplaint";
import usePGRSearch from "./pgr/usePGRSearch";
import usePGRUpdate from "./pgr/usePGRUpdate";
import useServiceDefs from "./pgr/useServiceDefs";
import useMobileValidation from "./pgr/useMobileValidation";
import usePGRInboxSearch from "./pgr/usePGRInboxSearch";
import useAutoAssignment from "./pgr/useAutoAssignment";
import useBusinessServiceStates from "./pgr/useBusinessServiceStates";

const pgr = {
  useProjectSearch,
  usePGRInitialization,
  useFetchBoundaries,
  useCreateComplaint,
  usePGRSearch,
  usePGRUpdate,
  useServiceDefs,
  useMobileValidation,
  usePGRInboxSearch,
  useAutoAssignment,
  useBusinessServiceStates,
};




const Hooks = {
  pgr,
};

const Utils = {
  browser: {
    pgr: () => { },
  },
  pgr: {
    ...utils,
  },
};

export const CustomisedHooks = {
  Hooks,
  Utils,
};

