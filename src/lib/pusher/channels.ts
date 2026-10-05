export function userChannel(userId: string) {
  return `private-user-${userId}`;
}

export function orgChannel(organizationId: string) {
  return `private-org-${organizationId}`;
}

export function taskChannel(taskId: string) {
  return `private-task-${taskId}`;
}