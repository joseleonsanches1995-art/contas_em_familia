import { revokeInviteAction, switchHouseholdAction } from "@/actions/household";
import { InviteForm } from "@/components/invite-form";
import { ReceivedInvites } from "@/components/received-invites";
import { requireMembership } from "@/lib/session";
import { getFamilyPage, getReceivedInvites } from "@/modules/households/invites";

export default async function FamiliaPage() {
  const membership = await requireMembership();
  const [family, received] = await Promise.all([
    getFamilyPage(membership.householdId, membership.userId),
    getReceivedInvites(membership.user.email),
  ]);
  const otherSpaces = family.spaces.filter((space) => space.householdId !== membership.householdId);

  return (
    <main className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">{membership.household.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Família</h1>
        <p className="mt-2 text-sm text-muted">
          Cada pessoa entra com o próprio e-mail. O convite abre este espaço para quem aceitar.
        </p>
      </header>

      <ReceivedInvites invites={received} />

      {otherSpaces.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Outros espaços seus</h2>
          {otherSpaces.map((space) => (
            <form key={space.householdId} action={switchHouseholdAction}>
              <input type="hidden" name="householdId" value={space.householdId} />
              <button className="min-h-11 text-sm text-accent">
                Abrir {space.household.name}
              </button>
            </form>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Quem está aqui</h2>
        <ul className="flex flex-col gap-2">
          {family.members.map((member) => (
            <li key={member.id} className="rounded-2xl bg-card px-4 py-3">
              <p className="font-medium">{member.user.name}</p>
              <p className="mt-1 text-sm text-muted">{member.user.email}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Convidar</h2>
        <InviteForm />
      </section>

      {family.sentInvites.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Convites enviados</h2>
          <ul className="flex flex-col gap-2">
            {family.sentInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="mt-1 text-xs text-muted">Aguardando aceite</p>
                </div>
                <form action={revokeInviteAction}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button className="min-h-11 px-3 text-sm text-danger">Cancelar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
