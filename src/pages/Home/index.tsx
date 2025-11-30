import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Calendar,
  Package,
  Activity,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Home = () => {
  useEffect(() => {
    document.title = "Dashboard - Avyaan Knitfab";
  }, []);

  const stats = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      change: "+20.1%",
      trend: "up",
      icon: DollarSign,
      description: "from last month",
    },
    {
      title: "Orders",
      value: "2,350",
      change: "+180.1%",
      trend: "up",
      icon: ShoppingCart,
      description: "from last month",
    },
    {
      title: "Active Users",
      value: "12,234",
      change: "+19%",
      trend: "up",
      icon: Users,
      description: "from last month",
    },
    {
      title: "Page Views",
      value: "573,290",
      change: "-4.3%",
      trend: "down",
      icon: Eye,
      description: "from last month",
    },
  ];

  // Revenue chart data
  const revenueData = [
    { name: "Jan", revenue: 4000, orders: 240 },
    { name: "Feb", revenue: 3000, orders: 139 },
    { name: "Mar", revenue: 2000, orders: 980 },
    { name: "Apr", revenue: 2780, orders: 390 },
    { name: "May", revenue: 1890, orders: 480 },
    { name: "Jun", revenue: 2390, orders: 380 },
    { name: "Jul", revenue: 3490, orders: 430 },
    { name: "Aug", revenue: 4000, orders: 520 },
    { name: "Sep", revenue: 3200, orders: 350 },
    { name: "Oct", revenue: 4500, orders: 680 },
    { name: "Nov", revenue: 3800, orders: 420 },
    { name: "Dec", revenue: 5200, orders: 750 },
  ];

  // Sales by category data
  const categoryData = [
    { name: "Knitwear", value: 400, color: "#0088FE" },
    { name: "Fabrics", value: 300, color: "#00C49F" },
    { name: "Accessories", value: 200, color: "#FFBB28" },
    { name: "Custom Orders", value: 100, color: "#FF8042" },
  ];

  // Weekly activity data
  const activityData = [
    { day: "Mon", orders: 12, revenue: 2400 },
    { day: "Tue", orders: 19, revenue: 1398 },
    { day: "Wed", orders: 8, revenue: 9800 },
    { day: "Thu", orders: 27, revenue: 3908 },
    { day: "Fri", orders: 18, revenue: 4800 },
    { day: "Sat", orders: 23, revenue: 3800 },
    { day: "Sun", orders: 15, revenue: 4300 },
  ];

  const recentOrders = [
    {
      id: "ORD-001",
      customer: "John Doe",
      amount: "$250.00",
      status: "completed",
      time: "2 hours ago",
    },
    {
      id: "ORD-002",
      customer: "Jane Smith",
      amount: "$150.00",
      status: "processing",
      time: "4 hours ago",
    },
    {
      id: "ORD-003",
      customer: "Bob Johnson",
      amount: "$350.00",
      status: "pending",
      time: "6 hours ago",
    },
    {
      id: "ORD-004",
      customer: "Alice Brown",
      amount: "$200.00",
      status: "completed",
      time: "8 hours ago",
    },
  ];

  const projects = [
    {
      name: "Summer Collection 2024",
      progress: 85,
      status: "In Progress",
      dueDate: "Mar 15",
    },
    {
      name: "Winter Knitwear Line",
      progress: 60,
      status: "In Progress",
      dueDate: "Apr 20",
    },
    {
      name: "Sustainable Fabrics",
      progress: 30,
      status: "Planning",
      dueDate: "May 10",
    },
    {
      name: "Custom Orders System",
      progress: 95,
      status: "Review",
      dueDate: "Feb 28",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      {/* <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Activity className="mr-2 h-4 w-4" />
            View Reports
          </Button>
          <Button size="sm">
            <Package className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div> */}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stat.trend === "up" ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    stat.trend === "up" ? "text-green-500" : "text-red-500"
                  }
                >
                  {stat.change}
                </span>
                <span className="ml-1">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">
                Revenue Overview
              </CardTitle>
              <CardDescription>
                Monthly revenue and order trends
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Last 12 months
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-xs fill-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Sales by Category
            </CardTitle>
            <CardDescription>
              Distribution of sales across product categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Weekly Activity
            </CardTitle>
            <CardDescription>
              Orders and revenue for the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="day"
                  className="text-xs fill-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="orders" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">
                Recent Orders
              </CardTitle>
              <CardDescription>
                You have {recentOrders.length} orders this week.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {order.customer
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {order.customer}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{order.amount}</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "default"
                            : order.status === "processing"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {order.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">
              Active Projects
            </CardTitle>
            <CardDescription>
              Current project status and progress overview
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Package className="mr-2 h-4 w-4" />
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {projects.map((project) => (
              <div
                key={project.name}
                className="space-y-3 p-4 border rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {project.status}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-medium leading-none mb-2">
                    {project.name}
                  </p>
                  <Progress value={project.progress} className="h-2" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{project.progress}% complete</span>
                  <span>Due {project.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
