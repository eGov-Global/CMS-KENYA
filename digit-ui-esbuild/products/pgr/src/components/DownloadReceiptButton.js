/* eslint-disable react/prop-types */
// Download-only alias of ReceiptActions, kept under the Mozambique component
// name so cross-fork merges stay cheap. New call sites use ReceiptActions.
import React from "react";
import ReceiptActions from "./ReceiptActions";

const DownloadReceiptButton = (props) => <ReceiptActions {...props} actions={["download"]} />;

export default DownloadReceiptButton;
