import { Role, WorkspaceMemberRole } from "@prisma/client";
import prisma from "../lib/prisma.js";

function slugifyWorkspaceName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "workspace";
}

export async function createWorkspaceForUser(options: {
  ownerUserId: string;
  ownerRole: Role;
  name: string;
  slugHint?: string;
}) {
  const slugBase = slugifyWorkspaceName(options.slugHint || options.name);
  let suffix = 0;
  let workspace = null as
    | {
        id: string;
        name: string;
        slug: string;
        createdByUserId: string;
        createdAt: Date;
      }
    | null;

  while (!workspace) {
    const nextSlug = suffix === 0 ? slugBase : `${slugBase}-${suffix + 1}`;
    try {
      workspace = await prisma.workspace.create({
        data: {
          name: options.name,
          slug: nextSlug,
          createdByUserId: options.ownerUserId,
          members: {
            create: {
              userId: options.ownerUserId,
              role:
                options.ownerRole === Role.WORKSPACE_VIEWER
                  ? WorkspaceMemberRole.WORKSPACE_VIEWER
                  : WorkspaceMemberRole.WORKSPACE_ADMIN,
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdByUserId: true,
          createdAt: true,
        },
      });
    } catch (error) {
      const known = error as { code?: string };
      if (known.code !== "P2002" || suffix > 25) {
        throw error;
      }
      suffix += 1;
    }
  }

  return workspace;
}
