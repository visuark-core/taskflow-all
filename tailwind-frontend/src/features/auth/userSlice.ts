import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | string;
  // add more fields if needed
}

interface UserState {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: UserState = {
  members: [],
  isLoading: false,
  error: null,
};

/**
 * Async thunk example: fetch team members from an API (optional)
 */
export const fetchTeamMembers = createAsyncThunk<
  TeamMember[],
  void,
  { rejectValue: string }
>("users/fetchTeamMembers", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get<TeamMember[]>("http://localhost:5000/api/team/members");
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch team members");
  }
});

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    // Add or update a member
    addOrUpdateMember(state, action: PayloadAction<TeamMember>) {
      const index = state.members.findIndex((m) => m.id === action.payload.id);
      if (index !== -1) {
        state.members[index] = action.payload; // update existing
      } else {
        state.members.push(action.payload); // add new
      }
      // Sort members so admins come first
      state.members.sort((a, b) => (a.role === "admin" ? -1 : b.role === "admin" ? 1 : 0));
    },
    removeMember(state, action: PayloadAction<string>) {
      state.members = state.members.filter((m) => m.id !== action.payload);
    },
    clearMembers(state) {
      state.members = [];
    },
    // If you want to reorder members manually (optional)
    setMembers(state, action: PayloadAction<TeamMember[]>) {
      state.members = action.payload;
      state.members.sort((a, b) => (a.role === "admin" ? -1 : b.role === "admin" ? 1 : 0));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamMembers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.members = action.payload;
        // Sort with admin first
        state.members.sort((a, b) => (a.role === "admin" ? -1 : b.role === "admin" ? 1 : 0));
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to load team members";
      });
  },
});

export const { addOrUpdateMember, removeMember, clearMembers, setMembers } = userSlice.actions;

export default userSlice.reducer;
