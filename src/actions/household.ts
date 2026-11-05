"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/session";
import {
  acceptInvite,
  declineInvite,
  inviteMember,
  revokeInvite,
  switchHousehold,
} from "@/modules/households/invites";

export type InviteState = { error?: string; ok?: string };

export async function sendInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const membership = await requireMembership();
  const result = await inviteMember({
    householdId: membership.householdId,
    invitedById: membership.userId,
    inviterEmail: membership.user.email,
    email: String(formData.get("email") ?? ""),
  });
  if ("error" in result) return { error: result.error };

  revalidateFamily();
  return { ok: `Convite enviado para ${result.email}. A pessoa vê o convite ao entrar com esse e-mail.` };
}

export async function acceptInviteAction(formData: FormData) {
  const membership = await requireMembership();
  const result = await acceptInvite({
    userId: membership.userId,
    email: membership.user.email,
    name: membership.user.name,
    inviteId: String(formData.get("inviteId") ?? ""),
  });
  if ("error" in result && result.error) return;

  revalidateFamily();
  redirect("/");
}

export async function declineInviteAction(formData: FormData) {
  const membership = await requireMembership();
  await declineInvite({
    userId: membership.userId,
    email: membership.user.email,
    inviteId: String(formData.get("inviteId") ?? ""),
  });
  revalidateFamily();
}

export async function revokeInviteAction(formData: FormData) {
  const membership = await requireMembership();
  await revokeInvite({
    householdId: membership.householdId,
    userId: membership.userId,
    inviteId: String(formData.get("inviteId") ?? ""),
  });
  revalidateFamily();
}

export async function switchHouseholdAction(formData: FormData) {
  const membership = await requireMembership();
  const result = await switchHousehold({
    userId: membership.userId,
    householdId: String(formData.get("householdId") ?? ""),
  });
  if ("error" in result && result.error) return;

  revalidateFamily();
  redirect("/");
}

function revalidateFamily() {
  revalidatePath("/");
  revalidatePath("/familia");
  revalidatePath("/contas");
  revalidatePath("/agenda");
  revalidatePath("/analises");
  revalidatePath("/historico");
}
