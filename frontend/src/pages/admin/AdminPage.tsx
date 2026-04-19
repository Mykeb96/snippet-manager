import { useCallback, useEffect, useState } from 'react'
import {
  createAdminTag,
  deleteAdminTag,
  fetchAdminTagsPage,
  fetchAdminUsersPage,
  updateAdminTag,
  type AdminUserDto,
} from '../../api/admin'
import type { TagDto } from '../../api/snippets'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastProvider'
import { formatTagDisplayName } from '../../utils/formatTagDisplayName'
import { confirmDeleteTag } from '../../utils/confirmDeleteTag'

export default function AdminPage() {
  const { token } = useAuth()
  const { showToast } = useToast()

  const [users, setUsers] = useState<AdminUserDto[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersHasMore, setUsersHasMore] = useState(false)
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersTotalCount, setUsersTotalCount] = useState<number | null>(null)

  const [tags, setTags] = useState<TagDto[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const [tagsError, setTagsError] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [savingTagId, setSavingTagId] = useState<number | null>(null)
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null)

  const loadUsers = useCallback(
    async (page: number, append: boolean) => {
      if (!token) return
      if (append) setUsersLoading(true)
      else {
        setUsersLoading(true)
        setUsersError(null)
      }
      try {
        const result = await fetchAdminUsersPage(page, token)
        if (append) {
          setUsers((prev) => [...prev, ...result.items])
        } else {
          setUsers(result.items)
        }
        setUsersPage(result.page)
        setUsersHasMore(result.hasMore)
        setUsersTotalCount(result.totalCount)
      } catch (e) {
        setUsersError(e instanceof Error ? e.message : 'Failed to load users.')
      } finally {
        setUsersLoading(false)
      }
    },
    [token],
  )

  const loadTags = useCallback(async () => {
    if (!token) return
    setTagsLoading(true)
    setTagsError(null)
    try {
      const result = await fetchAdminTagsPage(1, token, 100)
      setTags(result.items)
    } catch (e) {
      setTagsError(e instanceof Error ? e.message : 'Failed to load tags.')
    } finally {
      setTagsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadUsers(1, false)
  }, [loadUsers])

  useEffect(() => {
    void loadTags()
  }, [loadTags])

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault()
    const name = newTagName.trim()
    if (!name || !token) return
    setCreatingTag(true)
    try {
      const created = await createAdminTag(name, token)
      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTagName('')
      showToast('Tag created.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create tag.', { variant: 'error' })
    } finally {
      setCreatingTag(false)
    }
  }

  function startEdit(tag: TagDto) {
    setEditingId(tag.id)
    setEditName(formatTagDisplayName(tag.name))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  async function saveEdit(id: number) {
    if (!token) return
    const name = editName.trim()
    if (!name) return
    setSavingTagId(id)
    try {
      const updated = await updateAdminTag(id, name, token)
      setTags((prev) =>
        prev.map((t) => (t.id === id ? updated : t)).sort((a, b) => a.name.localeCompare(b.name)),
      )
      cancelEdit()
      showToast('Tag updated.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update tag.', { variant: 'error' })
    } finally {
      setSavingTagId(null)
    }
  }

  async function handleDelete(tag: TagDto) {
    if (!token) return
    const label = formatTagDisplayName(tag.name)
    if (!(await confirmDeleteTag(label))) return
    setDeletingTagId(tag.id)
    try {
      await deleteAdminTag(tag.id, token)
      setTags((prev) => prev.filter((t) => t.id !== tag.id))
      showToast('Tag deleted.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete tag.', { variant: 'error' })
    } finally {
      setDeletingTagId(null)
    }
  }

  return (
    <div className="admin-page section-anchor">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Admin Dashboard</h1>
        <p className="admin-page__intro">Users and global tags for this deployment.</p>
      </header>

      <section className="admin-page__section" aria-labelledby="admin-users-heading">
        <div className="admin-page__section-heading">
          <h2 id="admin-users-heading" className="admin-page__section-title admin-page__section-title--inline">
            Users
          </h2>
          {usersTotalCount !== null && (
            <span className="admin-page__stat" aria-label={`${usersTotalCount} users total`}>
              {usersTotalCount} total
            </span>
          )}
        </div>
        {usersError && (
          <p className="admin-page__error" role="alert">
            {usersError}
          </p>
        )}
        {usersLoading && users.length === 0 ? (
          <p className="admin-page__muted">Loading users…</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Username</th>
                  <th scope="col">Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {usersHasMore && (
          <div className="admin-page__more">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={usersLoading}
              onClick={() => void loadUsers(usersPage + 1, true)}
            >
              {usersLoading ? 'Loading…' : 'Load more users'}
            </button>
          </div>
        )}
      </section>

      <section className="admin-page__section" aria-labelledby="admin-tags-heading">
        <h2 id="admin-tags-heading" className="admin-page__section-title">
          Tags
        </h2>
        <p className="admin-page__hint">
          Manage tags. Deleting a tag removes it from any snippets that reference it.
        </p>
        <form className="admin-tag-create" onSubmit={(e) => void handleCreateTag(e)}>
          <input
            type="text"
            className="admin-tag-create__input"
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            autoComplete="off"
            maxLength={120}
          />
          <button type="submit" className="btn btn--primary" disabled={creatingTag || !newTagName.trim()}>
            {creatingTag ? 'Adding…' : 'Add tag'}
          </button>
        </form>
        {tagsError && (
          <p className="admin-page__error" role="alert">
            {tagsError}
          </p>
        )}
        {tagsLoading && tags.length === 0 ? (
          <p className="admin-page__muted">Loading tags…</p>
        ) : tags.length === 0 ? (
          <p className="admin-page__muted">No tags yet.</p>
        ) : (
          <ul className="admin-tag-list">
            {tags.map((tag) => (
              <li key={tag.id} className="admin-tag-row">
                {editingId === tag.id ? (
                  <>
                    <input
                      type="text"
                      className="admin-tag-row__input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoComplete="off"
                      maxLength={120}
                      aria-label="Edit tag name"
                    />
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={savingTagId === tag.id || !editName.trim()}
                      onClick={() => void saveEdit(tag.id)}
                    >
                      {savingTagId === tag.id ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="admin-tag-row__name">{formatTagDisplayName(tag.name)}</span>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEdit(tag)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      disabled={deletingTagId === tag.id}
                      onClick={() => void handleDelete(tag)}
                    >
                      {deletingTagId === tag.id ? '…' : 'Delete'}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
