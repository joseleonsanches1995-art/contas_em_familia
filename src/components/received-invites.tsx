import { acceptInviteAction, declineInviteAction } from "@/actions/household";

export function ReceivedInvites({
  invites,
}: {
  invites: Array<{
    id: string;
    household: { name: string };
    invitedBy: { name: string };
  }>;
}) {
  if (invites.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Convites para você</h2>
      <ul className="flex flex-col gap-2">
        {invites.map((invite) => (
          <li key={invite.id} className="rounded-2xl bg-card px-4 py-3">
            <p className="text-sm">
              {invite.invitedBy.name} convidou você para {invite.household.name}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={acceptInviteAction}>
                <input type="hidden" name="inviteId" value={invite.id} />
                <button className="min-h-11 rounded-full bg-accent px-4 text-sm font-medium text-white">
                  Aceitar
                </button>
              </form>
              <form action={declineInviteAction}>
                <input type="hidden" name="inviteId" value={invite.id} />
                <button className="min-h-11 rounded-full border border-line px-4 text-sm">
                  Recusar
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
