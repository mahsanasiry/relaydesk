"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "./client";

export function useSupabase() {
  return useState(createSupabaseBrowserClient)[0];
}
