import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Users,
  Settings,
  TrendingUp,
  TrendingDown,
  Bell,
  MessageSquare,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { formatDate } from '@/lib/utils';

const Dashboard = () => {
  const { user } = useAuth();
  
  // Mock data for simplified dashboard without machine management
  const machines = [];
  const machinesLoading = false;
  
  // Mock values for removed chat/notification features
  const unreadCount = 0;
  const chatRoomsLength = 0;

  // Calculate statistics
  const totalMachines = machines.length;
  const activeMachines = machines.filter((m) => m.isActive).length;
  const averageEfficiency =
    machines.length > 0
      ? Math.round(machines.reduce((sum, m) => sum + m.efficiency, 0) / machines.length)
      : 0;
  const highEfficiencyMachines = machines.filter((m) => m.efficiency >= 80).length;

  // Mock data for charts (in real app, this would come from API)
  const recentActivity = [
    { id: 1, action: 'Machine M001 efficiency updated', time: '2 minutes ago', type: 'update' },
    { id: 2, action: 'New user John Doe registered', time: '15 minutes ago', type: 'user' },
    {
      id: 3,
      action: 'Machine M005 maintenance scheduled',
      time: '1 hour ago',
      type: 'maintenance',
    },
    { id: 4, action: 'Chat room "Production Team" created', time: '2 hours ago', type: 'chat' },
  ];

  const efficiencyTrend = [
    { month: 'Jan', efficiency: 75 },
    { month: 'Feb', efficiency: 78 },
    { month: 'Mar', efficiency: 82 },
    { month: 'Apr', efficiency: 79 },
    { month: 'May', efficiency: 85 },
    { month: 'Jun', efficiency: 88 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Welcome back, {user?.firstName}!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your knitting operations today.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">{formatDate(new Date())}</div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMachines}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {activeMachines} active
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageEfficiency}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +2.5% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Unread notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chatRoomsLength}</div>
            <p className="text-xs text-muted-foreground">Chat rooms available</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Efficiency Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Machine Efficiency Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">High Efficiency (80%+)</span>
                <span className="text-sm text-muted-foreground">
                  {highEfficiencyMachines} machines
                </span>
              </div>
              <Progress value={(highEfficiencyMachines / totalMachines) * 100} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Medium Efficiency (60-79%)</span>
                <span className="text-sm text-muted-foreground">
                  {machines.filter((m) => m.efficiency >= 60 && m.efficiency < 80).length} machines
                </span>
              </div>
              <Progress
                value={
                  (machines.filter((m) => m.efficiency >= 60 && m.efficiency < 80).length /
                    totalMachines) *
                  100
                }
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Low Efficiency (&lt;60%)</span>
                <span className="text-sm text-muted-foreground">
                  {machines.filter((m) => m.efficiency < 60).length} machines
                </span>
              </div>
              <Progress
                value={(machines.filter((m) => m.efficiency < 60).length / totalMachines) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.type === 'update'
                        ? 'bg-blue-500'
                        : activity.type === 'user'
                          ? 'bg-green-500'
                          : activity.type === 'maintenance'
                            ? 'bg-yellow-500'
                            : 'bg-purple-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Machine Status Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Machine Status Overview
            </CardTitle>
            <Button variant="outline" size="sm">
              View All Machines
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.slice(0, 6).map((machine) => (
              <div
                key={machine.id}
                className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium truncate">{machine.machineName}</h4>
                  <Badge variant={machine.isActive ? 'default' : 'secondary'}>
                    {machine.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Efficiency:</span>
                    <span
                      className={`font-medium ${
                        machine.efficiency >= 80
                          ? 'text-green-500'
                          : machine.efficiency >= 60
                            ? 'text-yellow-500'
                            : 'text-red-500'
                      }`}
                    >
                      {machine.efficiency}%
                    </span>
                  </div>

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Dia:</span>
                    <span>{machine.dia}</span>
                  </div>

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>RPM:</span>
                    <span>{machine.rpm}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col">
              <Settings className="h-6 w-6 mb-2" />
              Add Machine
            </Button>
            <Button variant="outline" className="h-20 flex flex-col">
              <Users className="h-6 w-6 mb-2" />
              Manage Users
            </Button>
            <Button variant="outline" className="h-20 flex flex-col">
              <MessageSquare className="h-6 w-6 mb-2" />
              Start Chat
            </Button>
            <Button variant="outline" className="h-20 flex flex-col">
              <Calendar className="h-6 w-6 mb-2" />
              Schedule Maintenance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
