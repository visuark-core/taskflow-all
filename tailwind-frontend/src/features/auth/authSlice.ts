import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

/** User interface */
interface User {
  id: string;            // normalized id field
  _id?: string;          // optional MongoDB _id
  name: string;
  email: string;
  role: string;
  preferences: any;
  department?: string;
  bio?: string;
}

/** Normalize user data from API response */
const normalizeUser = (user: any): User => ({
  id: user.id || user._id || "",  // fallback to empty string if none present
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  preferences: user.preferences,
  department: user.department,
  bio: user.bio,
});

/** Authentication state */
interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean | null;
}

/** Payload for registration */
interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  company: string;
  role: string;
  department: string;
}

/** Response from registration */
interface RegisterResponse {
  user: User;
  token: string;
}

/** Payload for login */
interface LoginPayload {
  email: string;
  password: string;
}

/** Response from login */
interface LoginResponse {
  user: User;
  token: string;
}

/** Parse user from localStorage and normalize */
let parsedUser: User | null = null;
try {
  const userData = localStorage.getItem("user");
  parsedUser = userData ? normalizeUser(JSON.parse(userData)) : null;
} catch (error) {
  console.error("Invalid user data in localStorage. Clearing it.");
  localStorage.removeItem("user");
  parsedUser = null;
}

/** Initial state */
const initialState: AuthState = {
  token: localStorage.getItem("token") || null,
  user: parsedUser,
  isLoading: false,
  error: null,
  isAuthenticated: localStorage.getItem("isAuth") === "true",
};

/**
 * Async thunk to register user
 */
export const registerUser = createAsyncThunk<
  RegisterResponse,
  RegisterPayload,
  { rejectValue: string }
>("auth/registerUser", async (body, { rejectWithValue }) => {
  try {
    const res = await axios.post<RegisterResponse>(
      "http://localhost:5000/api/auth/register",
      body,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return {
      ...res.data,
      user: normalizeUser(res.data.user),
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      return rejectWithValue(error.response?.data?.message || "An error occurred");
    }
    return rejectWithValue("An unknown error occurred");
  }
});

/**
 * Async thunk to login user
 */
export const loginUser = createAsyncThunk<
  LoginResponse,
  LoginPayload,
  { rejectValue: string }
>("auth/loginUser", async (credentials, { rejectWithValue }) => {
  try {
    const res = await axios.post<LoginResponse>(
      "http://localhost:5000/api/auth/login",
      credentials,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return {
      ...res.data,
      user: normalizeUser(res.data.user),
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return rejectWithValue("Network error. Please try again.");
      }
      return rejectWithValue(error.response.data.message || "Login failed.");
    }
    return rejectWithValue("An unknown error occurred.");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isAuth");
    },
  },
  extraReducers: (builder) => {
    // Register handlers
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isLoading = false;
        state.isAuthenticated = true;

        localStorage.setItem("token", action.payload.token);
        localStorage.setItem("isAuth", "true");
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to register user.";
      });

    // Login handlers
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isLoading = false;
        state.isAuthenticated = true;

        localStorage.setItem("token", action.payload.token);
        localStorage.setItem("isAuth", "true");
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to login.";
      });
  },
});

export const { updateUser, logout } = authSlice.actions;

export default authSlice.reducer;
