import { ACCOUNT_STATUS, ROLES } from "../auth/permissions.js";

const PROFILE_COLUMNS = [
  "user_id",
  "email",
  "full_name",
  "business",
  "account_type",
  "membership_status",
  "status",
  "profile_photo_url",
  "vetted_at",
  "reputation_points"
].join(",");

export class ProfileRepository {
  constructor(backend) {
    this.backend = backend;
  }

  async findByUserId(userId) {
    const { data, error } = await this.backend
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new ProfileRepositoryError("Profile could not be loaded.", error);
    return data || null;
  }
}

export function authenticatedFallback(user) {
  return {
    id: user.id,
    user_id: user.id,
    email: user.email || "",
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Member",
    role: ROLES.CLIENT,
    account_type: ROLES.CLIENT,
    membership_status: "pending",
    account_status: ACCOUNT_STATUS.PENDING,
    profile_photo_url: ""
  };
}

export function mapProfile(row, user) {
  const membership = row.membership_status || (row.account_type === "member" ? "pending" : "free");
  const suspended = row.status === "suspended" || row.status === "removed" || membership === "suspended";
  return {
    ...row,
    id: row.user_id || user.id,
    user_id: row.user_id || user.id,
    email: row.email || user.email || "",
    full_name: row.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Member",
    role: row.account_type || ROLES.CLIENT,
    membership_status: membership,
    account_status: suspended ? ACCOUNT_STATUS.SUSPENDED : ACCOUNT_STATUS.ACTIVE,
    profile_photo_url: row.profile_photo_url || ""
  };
}

export class ProfileRepositoryError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "ProfileRepositoryError";
  }
}
