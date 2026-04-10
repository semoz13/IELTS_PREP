export class PathGenerator {
  private base: string;

  constructor(withBase: boolean = false) {
    this.base = withBase ? "http://localhost:3000/api" : "";
  }

  private prepend(path: string): string {
    return `${this.base}${path}`;
  }

  auth = {
    register: () => this.prepend("/auth/register"),
    login: () => this.prepend("/auth/login"),
    logout: () => this.prepend("/auth/logout"),
    me: () => this.prepend("/auth/me"),
  };

  users = {
    getAll: () => this.prepend("/users"),
    getById: (id: string) => this.prepend(`/users/${id}`),
    create: () => this.prepend("/users"),
    update: (id: string) => this.prepend(`/users/${id}`),
    delete: (id: string) => this.prepend(`/users/${id}`),
  };
}

export const paths = new PathGenerator();
