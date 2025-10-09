import React, { useState, useEffect, useCallback } from "react";
import {
    BarChart3,
    Users,
    Eye,
    Clock,
    TrendingUp,
    TrendingDown,
    Calendar,
    Filter,
    Download,
    RefreshCw,
    ArrowUp,
    ArrowDown,
    Activity,
    Shield,
    UserCheck,
    AlertTriangle,
    MessageCircle,
    Zap
} from "lucide-react";
import Sidebars from "@/components/Saidbar.js";
import styles from "../module_pages/AnalyticsPage.module.scss";

interface AnalyticsData {
    summary: {
        totalUsers: number;
        activeUsers: number;
        pageViews: number;
        avgSessionDuration: number;
        bounceRate: number;
        conversionRate: number;
    };
    traffic: {
        date: string;
        visitors: number;
        pageViews: number;
        sessions: number;
    }[];
    userGrowth: {
        month: string;
        newUsers: number;
        returningUsers: number;
        churnedUsers: number;
    }[];
    topPages: {
        path: string;
        views: number;
        uniqueVisitors: number;
        bounceRate: number;
    }[];
    realTime: {
        activeUsers: number;
        currentPages: { path: string; users: number }[];
        locations: { country: string; users: number }[];
    };
}

interface TimeRange {
    label: string;
    value: string;
    days: number;
}

export const AnalyticsPage: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>({
        label: "Last 30 days",
        value: "30d",
        days: 30
    });
    const [error, setError] = useState<string | null>(null);

    const timeRanges: TimeRange[] = [
        { label: "Last 7 days", value: "7d", days: 7 },
        { label: "Last 30 days", value: "30d", days: 30 },
        { label: "Last 90 days", value: "90d", days: 90 },
        { label: "Last year", value: "1y", days: 365 }
    ];

    const getAuthToken = useCallback((): string => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            throw new Error("No authentication token found");
        }
        return token;
    }, []);

    const loadAnalyticsData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/analytics?range=${timeRange.value}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load analytics: ${response.status}`);
            }

            const analyticsData = await response.json();
            setData(analyticsData);

        } catch (error) {
            console.error("Error loading analytics:", error);
            setError(error instanceof Error ? error.message : "Failed to load analytics data");

            // Fallback mock data
            setData(generateMockData(timeRange.days));
        } finally {
            setIsLoading(false);
        }
    }, [timeRange, getAuthToken]);

    useEffect(() => {
        loadAnalyticsData();
    }, [loadAnalyticsData]);

    const generateMockData = (days: number): AnalyticsData => {
        const traffic = Array.from({ length: days }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            return {
                date: date.toISOString().split('T')[0],
                visitors: Math.floor(Math.random() * 1000) + 500,
                pageViews: Math.floor(Math.random() * 5000) + 2000,
                sessions: Math.floor(Math.random() * 800) + 300
            };
        });

        const userGrowth = Array.from({ length: 6 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i));
            return {
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                newUsers: Math.floor(Math.random() * 1000) + 500,
                returningUsers: Math.floor(Math.random() * 800) + 400,
                churnedUsers: Math.floor(Math.random() * 100) + 50
            };
        });

        return {
            summary: {
                totalUsers: 15432,
                activeUsers: 8431,
                pageViews: 124567,
                avgSessionDuration: 4.32,
                bounceRate: 42.1,
                conversionRate: 3.2
            },
            traffic,
            userGrowth,
            topPages: [
                { path: "/dashboard", views: 25432, uniqueVisitors: 8431, bounceRate: 28.4 },
                { path: "/login", views: 18765, uniqueVisitors: 6543, bounceRate: 35.2 },
                { path: "/profile", views: 15432, uniqueVisitors: 5432, bounceRate: 22.1 },
                { path: "/settings", views: 9876, uniqueVisitors: 4321, bounceRate: 18.7 },
                { path: "/analytics", views: 7654, uniqueVisitors: 3210, bounceRate: 15.3 }
            ],
            realTime: {
                activeUsers: 47,
                currentPages: [
                    { path: "/dashboard", users: 12 },
                    { path: "/profile", users: 8 },
                    { path: "/settings", users: 6 },
                    { path: "/analytics", users: 5 },
                    { path: "/messages", users: 4 }
                ],
                locations: [
                    { country: "United States", users: 15 },
                    { country: "Germany", users: 8 },
                    { country: "United Kingdom", users: 6 },
                    { country: "Canada", users: 5 },
                    { country: "France", users: 4 }
                ]
            }
        };
    };

    const handleExportData = () => {
        if (!data) return;

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    };

    const getTrendIcon = (change: number) => {
        if (change > 0) {
            return <ArrowUp className={styles.trendIconPositive} />;
        } else if (change < 0) {
            return <ArrowDown className={styles.trendIconNegative} />;
        }
        return null;
    };

    const getTrendColor = (change: number) => {
        if (change > 0) return styles.positive;
        if (change < 0) return styles.negative;
        return styles.neutral;
    };

    if (isLoading && !data) {
        return (
            <div className={styles.container}>
                <Sidebars />
                <div className={styles.contentArea}>
                    <div className={styles.fullscreen}>
                        <div className={styles.loadingState}>
                            <RefreshCw className={`${styles.loadingIcon} ${styles.animateSpin}`} />
                            <p>Loading analytics data...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className={styles.container}>
                <Sidebars />
                <div className={styles.contentArea}>
                    <div className={styles.fullscreen}>
                        <div className={styles.errorState}>
                            <AlertTriangle className={styles.errorIcon} />
                            <h3>Failed to load analytics</h3>
                            <p>{error}</p>
                            <button onClick={loadAnalyticsData} className={styles.retryButton}>
                                <RefreshCw className={styles.buttonIcon} />
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className={styles.container}>
            <Sidebars />
            <div className={styles.contentArea}>
                <div className={styles.fullscreen}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerTop}>
                            <div className={styles.headerTitle}>
                                <div>
                                    <h1 className={styles.title}>Analytics Dashboard</h1>
                                    <p className={styles.subtitle}>
                                        Real-time insights and performance metrics
                                    </p>
                                </div>
                            </div>
                            <div className={styles.headerActions}>
                                <div className={styles.timeRangeSelector}>
                                    <Calendar className={styles.selectorIcon} />
                                    <select
                                        value={timeRange.value}
                                        onChange={(e) => {
                                            const selected = timeRanges.find(tr => tr.value === e.target.value);
                                            if (selected) setTimeRange(selected);
                                        }}
                                        className={styles.rangeSelect}
                                    >
                                        {timeRanges.map(range => (
                                            <option key={range.value} value={range.value}>
                                                {range.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleExportData}
                                    className={styles.exportButton}
                                    disabled={!data}
                                >
                                    <Download className={styles.buttonIcon} />
                                    Export
                                </button>
                                <button
                                    onClick={loadAnalyticsData}
                                    className={styles.refreshButton}
                                    disabled={isLoading}
                                >
                                    <RefreshCw className={`${styles.buttonIcon} ${isLoading ? styles.animateSpin : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statHeader}>
                                <div className={styles.statIcon}>
                                    <Users className={styles.icon} />
                                </div>
                                <div className={styles.statTrend}>
                                    {getTrendIcon(12.5)}
                                    <span className={`${styles.trendText} ${getTrendColor(12.5)}`}>
                                        +12.5%
                                    </span>
                                </div>
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>
                                    {formatNumber(data.summary.totalUsers)}
                                </div>
                                <div className={styles.statLabel}>Total Users</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statHeader}>
                                <div className={styles.statIcon}>
                                    <Activity className={styles.icon} />
                                </div>
                                <div className={styles.statTrend}>
                                    {getTrendIcon(8.3)}
                                    <span className={`${styles.trendText} ${getTrendColor(8.3)}`}>
                                        +8.3%
                                    </span>
                                </div>
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>
                                    {formatNumber(data.summary.activeUsers)}
                                </div>
                                <div className={styles.statLabel}>Active Users</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statHeader}>
                                <div className={styles.statIcon}>
                                    <Eye className={styles.icon} />
                                </div>
                                <div className={styles.statTrend}>
                                    {getTrendIcon(15.7)}
                                    <span className={`${styles.trendText} ${getTrendColor(15.7)}`}>
                                        +15.7%
                                    </span>
                                </div>
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>
                                    {formatNumber(data.summary.pageViews)}
                                </div>
                                <div className={styles.statLabel}>Page Views</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statHeader}>
                                <div className={styles.statIcon}>
                                    <Clock className={styles.icon} />
                                </div>
                                <div className={styles.statTrend}>
                                    {getTrendIcon(-2.1)}
                                    <span className={`${styles.trendText} ${getTrendColor(-2.1)}`}>
                                        -2.1%
                                    </span>
                                </div>
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>
                                    {data.summary.avgSessionDuration}m
                                </div>
                                <div className={styles.statLabel}>Avg. Session</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statHeader}>
                                <div className={styles.statIcon}>
                                    <TrendingDown className={styles.icon} />
                                </div>
                                <div className={styles.statTrend}>
                                    {getTrendIcon(-5.2)}
                                    <span className={`${styles.trendText} ${getTrendColor(-5.2)}`}>
                                        -5.2%
                                    </span>
                                </div>
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>
                                    {data.summary.bounceRate}%
                                </div>
                                <div className={styles.statLabel}>Bounce Rate</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statHeader}>
                                <div className={styles.statIcon}>
                                    <TrendingUp className={styles.icon} />
                                </div>
                                <div className={styles.statTrend}>
                                    {getTrendIcon(3.8)}
                                    <span className={`${styles.trendText} ${getTrendColor(3.8)}`}>
                                        +3.8%
                                    </span>
                                </div>
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>
                                    {data.summary.conversionRate}%
                                </div>
                                <div className={styles.statLabel}>Conversion Rate</div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className={styles.mainGrid}>
                        {/* Traffic Chart */}
                        <div className={styles.chartCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Traffic Overview</h3>
                                <div className={styles.cardActions}>
                                    <button className={styles.chartAction}>
                                        <Filter className={styles.actionIcon} />
                                    </button>
                                </div>
                            </div>
                            <div className={styles.chartContainer}>
                                <div className={styles.trafficChart}>
                                    {data.traffic.slice(-14).map((day, index) => (
                                        <div key={day.date} className={styles.chartBarGroup}>
                                            <div className={styles.barContainer}>
                                                <div
                                                    className={styles.trafficBar}
                                                    style={{
                                                        height: `${(day.visitors / 1500) * 100}%`
                                                    }}
                                                />
                                            </div>
                                            <div className={styles.barLabel}>
                                                {new Date(day.date).getDate()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.chartLegend}>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendColor} ${styles.visitors}`} />
                                        <span>Visitors</span>
                                    </div>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendColor} ${styles.pageViews}`} />
                                        <span>Page Views</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Real-Time Activity */}
                        <div className={styles.chartCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>
                                    <Zap className={styles.realtimeIcon} />
                                    Real-Time Activity
                                </h3>
                                <div className={styles.realtimeBadge}>
                                    <div className={styles.pulseDot} />
                                    Live
                                </div>
                            </div>
                            <div className={styles.realtimeContent}>
                                <div className={styles.activeUsers}>
                                    <div className={styles.activeUsersCount}>
                                        {data.realTime.activeUsers}
                                    </div>
                                    <div className={styles.activeUsersLabel}>
                                        Users Online Now
                                    </div>
                                </div>
                                <div className={styles.currentPages}>
                                    <h4 className={styles.sectionTitle}>Current Pages</h4>
                                    {data.realTime.currentPages.map((page, index) => (
                                        <div key={page.path} className={styles.pageItem}>
                                            <div className={styles.pagePath}>
                                                {page.path}
                                            </div>
                                            <div className={styles.pageUsers}>
                                                {page.users} users
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.userLocations}>
                                    <h4 className={styles.sectionTitle}>Top Locations</h4>
                                    {data.realTime.locations.map((location, index) => (
                                        <div key={location.country} className={styles.locationItem}>
                                            <div className={styles.locationCountry}>
                                                {location.country}
                                            </div>
                                            <div className={styles.locationUsers}>
                                                {location.users} users
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Top Pages */}
                        <div className={styles.chartCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Top Pages</h3>
                                <button className={styles.viewAllButton}>
                                    View All
                                </button>
                            </div>
                            <div className={styles.pagesList}>
                                {data.topPages.map((page, index) => (
                                    <div key={page.path} className={styles.pageRow}>
                                        <div className={styles.pageRank}>
                                            #{index + 1}
                                        </div>
                                        <div className={styles.pageInfo}>
                                            <div className={styles.pagePath}>
                                                {page.path}
                                            </div>
                                            <div className={styles.pageStats}>
                                                <span className={styles.pageViews}>
                                                    {formatNumber(page.views)} views
                                                </span>
                                                <span className={styles.bounceRate}>
                                                    {page.bounceRate}% bounce
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.pageTraffic}>
                                            <div
                                                className={styles.trafficIndicator}
                                                style={{
                                                    width: `${(page.views / data.topPages[0].views) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* User Growth */}
                        <div className={styles.chartCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>User Growth</h3>
                                <div className={styles.growthLegend}>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendColor} ${styles.newUsers}`} />
                                        <span>New</span>
                                    </div>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendColor} ${styles.returningUsers}`} />
                                        <span>Returning</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.growthChart}>
                                {data.userGrowth.map((month, index) => (
                                    <div key={month.month} className={styles.growthBarGroup}>
                                        <div className={styles.growthBars}>
                                            <div
                                                className={`${styles.growthBar} ${styles.newUsers}`}
                                                style={{
                                                    height: `${(month.newUsers / 1500) * 100}%`
                                                }}
                                            />
                                            <div
                                                className={`${styles.growthBar} ${styles.returningUsers}`}
                                                style={{
                                                    height: `${(month.returningUsers / 1500) * 100}%`
                                                }}
                                            />
                                        </div>
                                        <div className={styles.growthLabel}>
                                            {month.month.split(' ')[0]}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className={styles.metricsGrid}>
                        <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                                <Shield className={styles.metricIcon} />
                                <h4>Security Events</h4>
                            </div>
                            <div className={styles.metricValue}>24</div>
                            <div className={styles.metricChange}>
                                <ArrowDown className={styles.metricChangeIcon} />
                                <span className={styles.positive}>-12% from last week</span>
                            </div>
                        </div>

                        <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                                <UserCheck className={styles.metricIcon} />
                                <h4>Moderator Activity</h4>
                            </div>
                            <div className={styles.metricValue}>156</div>
                            <div className={styles.metricChange}>
                                <ArrowUp className={styles.metricChangeIcon} />
                                <span className={styles.positive}>+8% from last week</span>
                            </div>
                        </div>

                        <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                                <MessageCircle className={styles.metricIcon} />
                                <h4>User Reports</h4>
                            </div>
                            <div className={styles.metricValue}>42</div>
                            <div className={styles.metricChange}>
                                <ArrowDown className={styles.metricChangeIcon} />
                                <span className={styles.positive}>-5% from last week</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;