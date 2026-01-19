import { importFile } from "@/utils/apiUtils";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { importEventFromFile } from "../../Events/EventApi";
import type { RejectedError } from "../CalendarSlice";

export const importEventFromFileAsync = createAsyncThunk<
  void,
  {
    calLink: string;
    file: File;
  },
  { rejectValue: RejectedError }
>("calendars/importEvent", async ({ calLink, file }, { rejectWithValue }) => {
  try {
    const id = ((await importFile(file)) as Record<string, string>)._id;
    await importEventFromFile(id, calLink);
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});
