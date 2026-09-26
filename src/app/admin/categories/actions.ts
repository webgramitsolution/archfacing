'use server'

/**
 * §7.11.1.1 — the admin can add, edit and remove categories.
 *
 * ★ A slug is never editable once the row exists. It appears in public URLs
 *   and is stored verbatim on every Post (`Post.category` / `Post.subCategory`
 *   hold the slug, not a foreign key), so changing it would silently orphan
 *   saved postings.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma, type PostType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { slugify } from '@/lib/utils'
import { POST_TYPE_VALUES } from './post-type-list'

export type CategoryState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
  created?: { name: string; slug: string }
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const DUPLICATE_SLUG = 'A category with this slug already exists for this type.'

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(80)
    .regex(SLUG_RE, 'Use lowercase letters, numbers and hyphens only'),
  type: z.enum(POST_TYPE_VALUES as [PostType, ...PostType[]]),
  parentId: z.string().trim().optional(),
  description: z.string().trim().max(400, 'Please keep this under 400 characters').optional(),
  sortOrder: z.coerce.number().int('Whole numbers only').min(0).max(9999),
})

const updateSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().trim().max(400, 'Please keep this under 400 characters').optional(),
  sortOrder: z.coerce.number().int('Whole numbers only').min(0).max(9999),
})

function collectFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    fieldErrors[key] ??= issue.message
  }
  return fieldErrors
}

function readForm(formData: FormData) {
  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string' && v.trim()) raw[k] = v.trim()
  }
  return raw
}

// ═══════════════════════════════════════════════════════════
//  Create
// ═══════════════════════════════════════════════════════════

export async function createCategoryAction(
  _prev: CategoryState | null,
  formData: FormData
): Promise<CategoryState> {
  const admin = await requirePermission('admin:categories')

  const raw = readForm(formData)
  // the slug is only suggested from the name — the admin may overwrite it
  if (!raw.slug && raw.name) raw.slug = slugify(raw.name)
  raw.sortOrder ??= '0'

  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Some fields need to be corrected.',
      fieldErrors: collectFieldErrors(parsed.error),
      values: raw,
    }
  }

  const d = parsed.data

  // a parent must exist, share the type, and be Primary or Secondary —
  // categories go three levels deep (Primary → Secondary → Tertiary)
  let parentId: string | null = null
  if (d.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: d.parentId },
      select: { id: true, type: true, parentId: true, parent: { select: { parentId: true } } },
    })
    if (!parent || parent.type !== d.type) {
      return {
        ok: false,
        error: 'That parent category does not belong to this type.',
        fieldErrors: { parentId: 'Choose a parent from this type' },
        values: raw,
      }
    }
    if (parent.parent?.parentId) {
      return {
        ok: false,
        error: 'Categories go three levels deep — a tertiary category cannot have children.',
        fieldErrors: { parentId: 'Pick a primary or secondary category' },
        values: raw,
      }
    }
    parentId = parent.id
  }

  try {
    const category = await prisma.category.create({
      data: {
        type: d.type,
        slug: d.slug,
        name: d.name,
        description: d.description || null,
        sortOrder: d.sortOrder,
        parentId,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'CATEGORY_CREATED',
        entityType: 'Category',
        entityId: category.id,
        after: {
          type: category.type,
          slug: category.slug,
          name: category.name,
          parentId,
        },
      },
    })

    revalidatePath('/admin/categories')
    return { ok: true, created: { name: category.name, slug: category.slug } }
  } catch (e) {
    // @@unique([type, slug])
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return {
        ok: false,
        error: DUPLICATE_SLUG,
        fieldErrors: { slug: DUPLICATE_SLUG },
        values: raw,
      }
    }
    console.error('Category create fail:', e)
    return {
      ok: false,
      error: 'Could not create the category. Please try again.',
      values: raw,
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  Edit — name, description and sort order only
// ═══════════════════════════════════════════════════════════

export async function updateCategoryAction(
  _prev: CategoryState | null,
  formData: FormData
): Promise<CategoryState> {
  const admin = await requirePermission('admin:categories')

  const raw = readForm(formData)
  raw.sortOrder ??= '0'

  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Some fields need to be corrected.',
      fieldErrors: collectFieldErrors(parsed.error),
      values: raw,
    }
  }

  const d = parsed.data

  const before = await prisma.category.findUnique({
    where: { id: d.id },
    select: { id: true, name: true, description: true, sortOrder: true },
  })
  if (!before) return { ok: false, error: 'That category no longer exists.', values: raw }

  // ★ the slug is deliberately absent from this update
  await prisma.category.update({
    where: { id: d.id },
    data: {
      name: d.name,
      description: d.description || null,
      sortOrder: d.sortOrder,
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: d.id,
      before: {
        name: before.name,
        description: before.description,
        sortOrder: before.sortOrder,
      },
      after: {
        name: d.name,
        description: d.description ?? null,
        sortOrder: d.sortOrder,
      },
    },
  })

  revalidatePath('/admin/categories')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════
//  Show / hide — preferred over deleting
// ═══════════════════════════════════════════════════════════

export async function toggleCategoryAction(id: string, activate: boolean) {
  const admin = await requirePermission('admin:categories')

  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!category) return { ok: false, error: 'That category no longer exists.' }

  await prisma.category.update({ where: { id }, data: { isActive: activate } })

  // hiding a parent hides everything under it — both levels below
  if (!activate) {
    await prisma.category.updateMany({
      where: { OR: [{ parentId: id }, { parent: { parentId: id } }] },
      data: { isActive: false },
    })
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: activate ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
      entityType: 'Category',
      entityId: id,
      after: { name: category.name, isActive: activate },
    },
  })

  revalidatePath('/admin/categories')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════
//  Delete — only when nothing depends on it
// ═══════════════════════════════════════════════════════════

/**
 * `Post` stores the category **slug** in `Post.category` and `Post.subCategory`
 * rather than a foreign key, so the database will not stop a delete for us.
 * Both checks therefore happen here, before the row is removed.
 */
export async function deleteCategoryAction(id: string) {
  const admin = await requirePermission('admin:categories')

  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      _count: { select: { children: true } },
    },
  })
  if (!category) return { ok: false, error: 'That category no longer exists.' }

  if (category._count.children > 0) {
    const n = category._count.children
    return {
      ok: false,
      error: `“${category.name}” still has ${n} sub-${
        n === 1 ? 'category' : 'categories'
      }. Remove or move ${n === 1 ? 'it' : 'them'} first, or hide this category instead.`,
    }
  }

  // soft-deleted postings count too — restoring one must not break its category
  const postCount = await prisma.post.count({
    where: {
      type: category.type,
      OR: [{ category: category.slug }, { subCategory: category.slug }],
    },
  })

  if (postCount > 0) {
    return {
      ok: false,
      error: `“${category.name}” is used by ${postCount} ${
        postCount === 1 ? 'posting' : 'postings'
      }. Hide it instead of deleting it, so those postings keep working.`,
    }
  }

  await prisma.category.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'CATEGORY_DELETED',
      entityType: 'Category',
      entityId: id,
      before: { type: category.type, slug: category.slug, name: category.name },
    },
  })

  revalidatePath('/admin/categories')
  return { ok: true }
}
