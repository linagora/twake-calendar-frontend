import { importEventFromFile } from "@/features/Events/EventApi";
import { importFile } from "@/utils/apiUtils";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { RejectedError } from "../CalendarSlice";

export const importEventFromFileAsync = createAsyncThunk<
  void,
  {
    calLink: string;
    file: File;
  },
  { rejectValue: RejectedError }
>("calendars/importEvent", async ({ calLink, file }, { rejectWithValue }) => {
  try {
    const response = await importFile(file);
    const id = response?._id;
    if (!id) {
      return rejectWithValue({
        message: "Failed to upload file: missing file ID",
        status: undefined,
      });
    }
    await importEventFromFile(id, calLink);
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});
